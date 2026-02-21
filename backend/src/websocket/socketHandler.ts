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
} from '@deenup/shared';
import { GAME_SESSION, MATCH_ERROR_CODES } from '@deenup/shared';
import { validateJoinQueue, validateSubmitAnswer } from '../validators/match';
import type { GameEngine } from '../services/gameEngine';
import type { MatchmakingService, QueueEntry } from '../services/matchmakingService';
import type { AuthenticatedSocket } from './socketAuth';

/**
 * Creates and wires all Socket.io event handlers.
 * Returns a cleanup function to stop the matchmaking loop.
 */
export function createSocketHandler(
  io: Server,
  gameEngine: GameEngine,
  matchmakingService: MatchmakingService
): () => void {
  // -------------------------------------------------------------------------
  // Helper: emit an error to a specific socket
  // -------------------------------------------------------------------------
  function emitError(socket: AuthenticatedSocket, code: string, message: string): void {
    const payload: MatchErrorPayload = { code, message };
    socket.emit(SERVER_EVENTS.ERROR, payload);
  }

  // -------------------------------------------------------------------------
  // Helper: build a QuestionStartPayload from a session question
  // -------------------------------------------------------------------------
  function buildQuestionStart(
    matchId: string,
    questionPayload: ReturnType<GameEngine['advanceQuestion']>
  ): QuestionStartPayload | null {
    if (!questionPayload) return null;
    const session = gameEngine.getSession(matchId);
    if (!session) return null;

    return {
      matchId,
      questionOrder: questionPayload.questionOrder,
      totalQuestions: session.questions.length,
      questionId: session.questions[questionPayload.questionOrder].id,
      questionText: questionPayload.questionText,
      answers: questionPayload.answers,
      difficulty: questionPayload.difficulty,
      timeLimitMs: questionPayload.timeLimitMs,
    };
  }

  // -------------------------------------------------------------------------
  // Helper: emit QUESTION_REVEAL and then either next question or match end
  // -------------------------------------------------------------------------
  async function handleBothAnswered(
    matchId: string,
    questionOrder: number
  ): Promise<void> {
    const session = gameEngine.getSession(matchId);
    if (!session) return;

    const answerSlot = session.answers[questionOrder];
    const currentQuestion = session.questions[questionOrder];

    // Build reveal payload
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

    // Emit reveal to both players in the match room
    io.to(matchId).emit(SERVER_EVENTS.QUESTION_REVEAL, revealPayload);

    // Wait the reveal delay, then advance or finalize
    await delay(GAME_SESSION.ANSWER_REVEAL_DELAY_MS);

    const nextQuestion = gameEngine.advanceQuestion(matchId);

    if (nextQuestion) {
      // Still more questions
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

        const endPayload: MatchEndedPayload = {
          matchId: result.matchId,
          winnerId: result.winnerId,
          player1Score: result.player1Score,
          player2Score: result.player2Score,
          player1EloChange: result.player1EloDelta,
          player2EloChange: result.player2EloDelta,
          player1EloAfter: result.player1EloAfter,
          player2EloAfter: result.player2EloAfter,
          answers: [],
        };

        io.to(matchId).emit(SERVER_EVENTS.MATCH_ENDED, endPayload);
      } catch (err: any) {
        io.to(matchId).emit(SERVER_EVENTS.ERROR, {
          code: err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR,
          message: err?.message ?? 'Failed to finalize match',
        } as MatchErrorPayload);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helper: handle a matched pair — create session and emit MATCH_FOUND + first question
  // -------------------------------------------------------------------------
  async function handleMatchFound(
    player1Entry: QueueEntry,
    player2Entry: QueueEntry
  ): Promise<void> {
    // Use a default theme ID for MVP — players can specify later
    const themeId = '00000000-0000-0000-0000-000000000001';

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

      // Both sockets join the match room
      const player1Socket = io.sockets.sockets.get(player1Entry.socketId) as
        | AuthenticatedSocket
        | undefined;
      const player2Socket = io.sockets.sockets.get(player2Entry.socketId) as
        | AuthenticatedSocket
        | undefined;

      if (player1Socket) player1Socket.join(matchId);
      if (player2Socket) player2Socket.join(matchId);

      // Emit MATCH_FOUND to each player with opponent info
      if (player1Socket) {
        const payload: MatchFoundPayload = {
          matchId,
          opponentId: player2Entry.playerId,
          opponentDisplayName: player2Entry.playerId, // display name resolution is post-MVP
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

      // Start the session — get first question payload
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
      // Notify both sockets of the failure
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
      handleMatchFound(player1, player2).catch(() => {});
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

  // -------------------------------------------------------------------------
  // Per-connection event wiring
  // -------------------------------------------------------------------------
  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const playerId = socket.userId;

    // ------------------------------------------------------------------
    // JOIN_QUEUE
    // ------------------------------------------------------------------
    socket.on(CLIENT_EVENTS.JOIN_QUEUE, async (payload: JoinQueuePayload) => {
      const validation = validateJoinQueue(payload);
      if (!validation.success) {
        emitError(socket, MATCH_ERROR_CODES.VALIDATION_ERROR, 'Invalid queue payload');
        return;
      }

      try {
        const queueSize = matchmakingService.joinQueue(
          playerId,
          socket.id,
          1000, // Default ELO — real ELO should be fetched from DB in production
          payload.matchType
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

        // Acknowledge the submitting player's answer
        const acceptedPayload: AnswerAcceptedPayload = {
          matchId,
          questionOrder,
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
          correctAnswerIndex: result.correctAnswerIndex,
        };
        socket.emit(SERVER_EVENTS.ANSWER_ACCEPTED, acceptedPayload);

        // Notify opponent that the player answered (without revealing which answer)
        const session = gameEngine.getSession(matchId);
        if (session) {
          const opponentId =
            playerId === session.player1Id ? session.player2Id : session.player1Id;

          // Find the opponent's socket from the match room
          io.to(matchId)
            .except(socket.id)
            .emit(SERVER_EVENTS.OPPONENT_ANSWERED, {
              matchId,
              questionOrder,
              answeredAt: new Date().toISOString(),
            } as OpponentAnsweredPayload);

          if (result.bothAnswered) {
            // Both players have answered — reveal and advance
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
        await gameEngine.abandonMatch(payload.matchId, playerId);

        // Notify the opponent
        io.to(payload.matchId).except(socket.id).emit(SERVER_EVENTS.MATCH_ABANDONED, {
          matchId: payload.matchId,
          abandonedBy: playerId,
        });
      } catch (err: any) {
        emitError(socket, err?.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR, err?.message ?? 'Failed to abandon match');
      }
    });

    // ------------------------------------------------------------------
    // DISCONNECT — auto-leave queue
    // ------------------------------------------------------------------
    socket.on('disconnect', () => {
      matchmakingService.leaveQueue(playerId);
    });
  });

  // Return cleanup function
  return () => {
    matchmakingService.stopLoop();
  };
}

// -------------------------------------------------------------------------
// Utility
// -------------------------------------------------------------------------
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
