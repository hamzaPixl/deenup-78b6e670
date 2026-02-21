// backend/src/websocket/socketHandler.ts
import { Server } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@deenup/shared';
import type {
  JoinQueuePayload,
  SubmitAnswerPayload,
  QueueJoinedPayload,
  MatchFoundPayload,
  QuestionStartPayload,
  QuestionRevealPayload,
  AnswerAcceptedPayload,
  OpponentAnsweredPayload,
  MatchEndedPayload,
  MatchErrorPayload,
  AnswerSummary,
  MatchAnswer,
} from '@deenup/shared';
import { GAME_SESSION, MATCH_ERROR_CODES } from '@deenup/shared';
import { validateJoinQueue, validateSubmitAnswer } from '../validators/match';
import type { GameEngine } from '../services/gameEngine';
import type { MatchmakingService, QueueEntry } from '../services/matchmakingService';
import type { MatchService } from '../services/matchService';
import type { ProfileService } from '../services/profileService';
import type { AuthenticatedSocket } from './socketAuth';

/**
 * Creates and wires all Socket.io event handlers.
 * Returns a cleanup function to stop the matchmaking loop and orphan cleanup.
 */
export function createSocketHandler(
  io: Server,
  gameEngine: GameEngine,
  matchmakingService: MatchmakingService,
  matchService: MatchService,
  profileService: ProfileService
): () => void {
  // H1: per-(matchId, questionOrder) lock to prevent duplicate QUESTION_REVEAL on concurrent submits
  const revealInProgress = new Set<string>();

  // -------------------------------------------------------------------------
  // Helper: emit an error to a specific socket
  // -------------------------------------------------------------------------
  function emitError(socket: AuthenticatedSocket, code: string, message: string): void {
    const payload: MatchErrorPayload = { code, message };
    socket.emit(SERVER_EVENTS.ERROR, payload);
  }

  // -------------------------------------------------------------------------
  // Helper: emit QUESTION_REVEAL and then either next question or match end
  // -------------------------------------------------------------------------
  async function handleBothAnswered(
    matchId: string,
    questionOrder: number
  ): Promise<void> {
    // H1: idempotency lock — only one caller proceeds
    const lockKey = `${matchId}:${questionOrder}`;
    if (revealInProgress.has(lockKey)) return;
    revealInProgress.add(lockKey);

    try {
      const session = gameEngine.getSession(matchId);
      if (!session) return;

      const answerSlot = session.answers[questionOrder];
      const currentQuestion = session.questions[questionOrder];

      function buildAnswerSummary(
        playerId: string,
        record: NonNullable<typeof answerSlot.player1>
      ): AnswerSummary {
        return {
          playerId,
          selectedAnswerIndex: record.selectedAnswerIndex,
          isCorrect: record.isCorrect,
          timeTakenMs: record.timeTakenMs,
          pointsEarned: record.pointsEarned,
        };
      }

      const revealPayload: QuestionRevealPayload = {
        matchId,
        questionOrder,
        correctAnswerIndex: currentQuestion.correct_answer_index,
        explanationFr: currentQuestion.explanation_fr,
        player1Answer: answerSlot.player1
          ? buildAnswerSummary(session.player1Id, answerSlot.player1)
          : null,
        player2Answer: answerSlot.player2
          ? buildAnswerSummary(session.player2Id, answerSlot.player2)
          : null,
        player1Score: session.player1Score,
        player2Score: session.player2Score,
      };

      io.to(matchId).emit(SERVER_EVENTS.QUESTION_REVEAL, revealPayload);

      await delay(GAME_SESSION.ANSWER_REVEAL_DELAY_MS);

      const nextQuestion = gameEngine.advanceQuestion(matchId);

      if (nextQuestion) {
        const updatedSession = gameEngine.getSession(matchId);
        if (!updatedSession) return;

        const startPayload: QuestionStartPayload = {
          matchId,
          questionOrder: nextQuestion.questionOrder,
          totalQuestions: updatedSession.questions.length,
          questionId: updatedSession.questions[nextQuestion.questionOrder].id,
          questionText: nextQuestion.questionText,
          answers: nextQuestion.answers,
          difficulty: nextQuestion.difficulty,
          timeLimitMs: nextQuestion.timeLimitMs,
        };

        io.to(matchId).emit(SERVER_EVENTS.QUESTION_START, startPayload);
      } else {
        // Match is over — finalize
        try {
          const result = await gameEngine.finalizeMatch(matchId);

          // C3: fetch persisted answers for post-match review
          let answers: MatchAnswer[] = [];
          try {
            answers = await matchService.getMatchAnswers(result.matchId);
          } catch (err) {
            console.error('[SocketHandler] getMatchAnswers failed:', err);
          }

          const endPayload: MatchEndedPayload = {
            matchId: result.matchId,
            winnerId: result.winnerId,
            player1Score: result.player1Score,
            player2Score: result.player2Score,
            player1EloChange: result.player1EloDelta,
            player2EloChange: result.player2EloDelta,
            player1EloAfter: result.player1EloAfter,
            player2EloAfter: result.player2EloAfter,
            answers,
          };

          io.to(matchId).emit(SERVER_EVENTS.MATCH_ENDED, endPayload);
        } catch (err: any) {
          io.to(matchId).emit(SERVER_EVENTS.ERROR, {
            code: err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR,
            message: err?.message ?? 'Failed to finalize match',
          } as MatchErrorPayload);
        }
      }
    } finally {
      revealInProgress.delete(lockKey);
    }
  }

  // -------------------------------------------------------------------------
  // Helper: handle a matched pair — create session and emit MATCH_FOUND + first question
  // -------------------------------------------------------------------------
  async function handleMatchFound(
    player1Entry: QueueEntry,
    player2Entry: QueueEntry
  ): Promise<void> {
    // H3: use the resolved themeId from the queue entries, fall back to Quran theme
    const themeId = player1Entry.themeId ?? player2Entry.themeId ?? 'a1b2c3d4-0001-0001-0001-000000000001';

    try {
      const session = await gameEngine.createSession({
        player1Id: player1Entry.playerId,
        player2Id: player2Entry.playerId,
        player1Elo: player1Entry.elo,
        player2Elo: player2Entry.elo,
        matchType: player1Entry.matchType,
        themeId,
      });

      const matchId = session.matchId;

      const player1Socket = io.sockets.sockets.get(player1Entry.socketId) as
        | AuthenticatedSocket
        | undefined;
      const player2Socket = io.sockets.sockets.get(player2Entry.socketId) as
        | AuthenticatedSocket
        | undefined;

      if (player1Socket) player1Socket.join(matchId);
      if (player2Socket) player2Socket.join(matchId);

      if (player1Socket) {
        const payload: MatchFoundPayload = {
          matchId,
          opponentId: player2Entry.playerId,
          opponentDisplayName: player2Entry.playerId,
          opponentElo: player2Entry.elo,
          matchType: session.matchType,
          themeId: session.themeId,
        };
        player1Socket.emit(SERVER_EVENTS.MATCH_FOUND, payload);
      }

      if (player2Socket) {
        const payload: MatchFoundPayload = {
          matchId,
          opponentId: player1Entry.playerId,
          opponentDisplayName: player1Entry.playerId,
          opponentElo: player1Entry.elo,
          matchType: session.matchType,
          themeId: session.themeId,
        };
        player2Socket.emit(SERVER_EVENTS.MATCH_FOUND, payload);
      }

      const firstQuestion = await gameEngine.startSession(matchId);

      if (firstQuestion) {
        const startPayload: QuestionStartPayload = {
          matchId,
          questionOrder: firstQuestion.questionOrder,
          totalQuestions: session.questions.length,
          questionId: session.questions[0].id,
          questionText: firstQuestion.questionText,
          answers: firstQuestion.answers,
          difficulty: firstQuestion.difficulty,
          timeLimitMs: firstQuestion.timeLimitMs,
        };

        io.to(matchId).emit(SERVER_EVENTS.QUESTION_START, startPayload);
      }
    } catch (err: any) {
      [player1Entry.socketId, player2Entry.socketId].forEach((sid) => {
        const s = io.sockets.sockets.get(sid);
        if (s) {
          s.emit(SERVER_EVENTS.ERROR, {
            code: err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR,
            message: err?.message ?? 'Failed to create match session',
          } as MatchErrorPayload);
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Start matchmaking loop
  // -------------------------------------------------------------------------
  matchmakingService.startLoop(
    (player1, player2) => {
      handleMatchFound(player1, player2).catch((err) => {
        console.error('[SocketHandler] handleMatchFound error:', err);
      });
    },
    (timedOutEntry) => {
      const s = io.sockets.sockets.get(timedOutEntry.socketId);
      if (s) {
        s.emit(SERVER_EVENTS.QUEUE_TIMEOUT, {
          code: MATCH_ERROR_CODES.MATCHMAKING_TIMEOUT,
          message: 'Matchmaking timed out — no opponent found',
        });
      }
    }
  );

  // H12: wire orphan cleanup interval
  const cleanupInterval = setInterval(() => {
    const removed = gameEngine.cleanupOrphanedSessions(GAME_SESSION.ORPHAN_THRESHOLD_MS);
    if (removed.length > 0) {
      console.log(`[GameEngine] Cleaned up ${removed.length} orphaned sessions:`, removed);
    }
  }, GAME_SESSION.CLEANUP_INTERVAL_MS);

  // -------------------------------------------------------------------------
  // Per-connection event wiring
  // -------------------------------------------------------------------------
  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const playerId = socket.userId;

    // ------------------------------------------------------------------
    // JOIN_QUEUE
    // H2: fetch real ELO from DB before joining queue
    // ------------------------------------------------------------------
    socket.on(CLIENT_EVENTS.JOIN_QUEUE, async (payload: JoinQueuePayload) => {
      const validation = validateJoinQueue(payload);
      if (!validation.success) {
        emitError(socket, MATCH_ERROR_CODES.VALIDATION_ERROR, 'Invalid queue payload');
        return;
      }

      try {
        // H2: fetch actual player ELO from profile
        const profile = await profileService.getProfile(playerId);
        const playerElo = profile.elo;

        const queueSize = matchmakingService.joinQueue(
          playerId,
          socket.id,
          playerElo,
          payload.matchType,
          payload.themeId ?? null  // H3: pass themeId through
        );

        const queuePayload: QueueJoinedPayload = {
          position: queueSize,
          estimatedWaitSeconds: Math.min(queueSize * 5, 120),
        };

        socket.emit(SERVER_EVENTS.QUEUE_JOINED, queuePayload);
      } catch (err: any) {
        emitError(socket, err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR, err?.message ?? 'Failed to join queue');
      }
    });

    // ------------------------------------------------------------------
    // LEAVE_QUEUE
    // ------------------------------------------------------------------
    socket.on(CLIENT_EVENTS.LEAVE_QUEUE, () => {
      matchmakingService.leaveQueue(playerId);
      socket.emit(SERVER_EVENTS.QUEUE_LEFT, {});
    });

    // ------------------------------------------------------------------
    // SUBMIT_ANSWER
    // ------------------------------------------------------------------
    socket.on(CLIENT_EVENTS.SUBMIT_ANSWER, async (payload: SubmitAnswerPayload) => {
      const validation = validateSubmitAnswer(payload);
      if (!validation.success) {
        emitError(socket, MATCH_ERROR_CODES.VALIDATION_ERROR, 'Invalid answer payload');
        return;
      }

      const { matchId, questionOrder, selectedAnswerIndex, timeTakenMs } = payload;

      try {
        const result = await gameEngine.submitAnswer(matchId, {
          playerId,
          questionOrder,
          selectedAnswerIndex,
          timeTakenMs,
        });

        const acceptedPayload: AnswerAcceptedPayload = {
          matchId,
          questionOrder,
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          correctAnswerIndex: result.correctAnswerIndex,
        };
        socket.emit(SERVER_EVENTS.ANSWER_ACCEPTED, acceptedPayload);

        const session = gameEngine.getSession(matchId);
        if (session) {
          io.to(matchId)
            .except(socket.id)
            .emit(SERVER_EVENTS.OPPONENT_ANSWERED, {
              matchId,
              questionOrder,
              answeredAt: new Date().toISOString(),
            } as OpponentAnsweredPayload);

          if (result.bothAnswered) {
            // H1: handleBothAnswered has internal lock to prevent double-execution
            await handleBothAnswered(matchId, questionOrder);
          }
        }
      } catch (err: any) {
        emitError(socket, err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR, err?.message ?? 'Failed to submit answer');
      }
    });

    // ------------------------------------------------------------------
    // ABANDON_MATCH
    // ------------------------------------------------------------------
    socket.on(CLIENT_EVENTS.ABANDON_MATCH, async (payload: { matchId: string }) => {
      if (!payload?.matchId) {
        emitError(socket, MATCH_ERROR_CODES.VALIDATION_ERROR, 'matchId is required');
        return;
      }

      try {
        const { opponentId } = await gameEngine.abandonMatch(payload.matchId, playerId);

        io.to(payload.matchId).except(socket.id).emit(SERVER_EVENTS.MATCH_ABANDONED, {
          matchId: payload.matchId,
          abandonedBy: playerId,
        });

        // notify the specific opponent if we know who they are
        if (opponentId) {
          // room emit above already covers it
        }
      } catch (err: any) {
        emitError(socket, err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR, err?.message ?? 'Failed to abandon match');
      }
    });

    // ------------------------------------------------------------------
    // DISCONNECT — auto-leave queue AND abandon any active match (H11)
    // ------------------------------------------------------------------
    socket.on('disconnect', () => {
      matchmakingService.leaveQueue(playerId);

      // H11: if player was in an active match, abandon it so opponent isn't stuck
      const activeSession = gameEngine.getSessionByPlayerId(playerId);
      if (activeSession) {
        gameEngine.abandonMatch(activeSession.matchId, playerId)
          .then(({ opponentId }) => {
            if (opponentId) {
              io.to(activeSession.matchId).emit(SERVER_EVENTS.MATCH_ABANDONED, {
                matchId: activeSession.matchId,
                abandonedBy: playerId,
              });
            }
          })
          .catch((err) => {
            console.error('[SocketHandler] abandonMatch on disconnect failed:', err);
          });
      }
    });
  });

  // Return cleanup function
  return () => {
    matchmakingService.stopLoop();
    clearInterval(cleanupInterval);
  };
}

// -------------------------------------------------------------------------
// Utility
// -------------------------------------------------------------------------
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
