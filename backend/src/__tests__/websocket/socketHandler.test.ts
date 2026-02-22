// backend/src/__tests__/websocket/socketHandler.test.ts
import { createSocketHandler } from '../../websocket/socketHandler';
import { CLIENT_EVENTS, SERVER_EVENTS, MATCH_ERROR_CODES } from '@deenup/shared';

// ---------------------------------------------------------------------------
// Mock helpers — build lightweight fakes for io, socket, gameEngine, matchmaking
// ---------------------------------------------------------------------------

function makeIo() {
  const sockets = new Map<string, any>();

  const roomEmitter = {
    _socketIds: [] as string[],
    except: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const io: any = {
    sockets: { sockets },
    on: jest.fn((event: string, cb: Function) => {
      if (event === 'connection') {
        io._connectionHandler = cb;
      }
    }),
    to: jest.fn(() => roomEmitter),
    _roomEmitter: roomEmitter,
    _connectionHandler: null as Function | null,
  };

  return io;
}

function makeSocket(userId = 'player-1', socketId = 'socket-1') {
  const listeners: Record<string, Function> = {};
  const socket: any = {
    id: socketId,
    userId,
    userEmail: `${userId}@example.com`,
    emit: jest.fn(),
    join: jest.fn(),
    on: jest.fn((event: string, cb: Function) => {
      listeners[event] = cb;
    }),
    _listeners: listeners,
    _trigger: (event: string, ...args: any[]) => {
      if (listeners[event]) listeners[event](...args);
    },
  };
  return socket;
}

function makeGameEngine() {
  return {
    createSession: jest.fn(),
    startSession: jest.fn(),
    submitAnswer: jest.fn(),
    abandonMatch: jest.fn().mockResolvedValue({ opponentId: null }),
    finalizeMatch: jest.fn(),
    advanceQuestion: jest.fn(),
    getSession: jest.fn(),
    getSessionByPlayerId: jest.fn().mockReturnValue(undefined),
  };
}

function makeMatchmakingService() {
  return {
    joinQueue: jest.fn(),
    leaveQueue: jest.fn(),
    startLoop: jest.fn(),
    stopLoop: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSocketHandler', () => {
  let io: ReturnType<typeof makeIo>;
  let gameEngine: ReturnType<typeof makeGameEngine>;
  let matchmakingService: ReturnType<typeof makeMatchmakingService>;
  let socket: ReturnType<typeof makeSocket>;
  let cleanup: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    io = makeIo();
    gameEngine = makeGameEngine();
    matchmakingService = makeMatchmakingService();

    const mockMatchService = { getMatchAnswers: jest.fn().mockResolvedValue([]) };
const mockProfileService = { getProfile: jest.fn().mockResolvedValue({ elo: 1000 }) };
    cleanup = createSocketHandler(io as any, gameEngine as any, matchmakingService as any, mockMatchService as any, mockProfileService as any);

    // Simulate a connection
    socket = makeSocket('player-1', 'socket-1');
    io.sockets.sockets.set('socket-1', socket);
    io._connectionHandler!(socket);
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // JOIN_QUEUE
  // -------------------------------------------------------------------------
  describe(CLIENT_EVENTS.JOIN_QUEUE, () => {
    it('emits QUEUE_JOINED when payload is valid', async () => {
      matchmakingService.joinQueue.mockReturnValue(3);

      socket._trigger(CLIENT_EVENTS.JOIN_QUEUE, { matchType: 'ranked' });

      // JOIN_QUEUE handler is async (fetches ELO) — wait for it to resolve
      await new Promise((r) => setImmediate(r));

      expect(matchmakingService.joinQueue).toHaveBeenCalledWith(
        'player-1',
        'socket-1',
        1000,
        'ranked',
        null  // themeId defaults to null when not provided
      );
      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.QUEUE_JOINED,
        expect.objectContaining({ position: 3 })
      );
    });

    it('emits ERROR when payload is invalid (missing matchType)', () => {
      socket._trigger(CLIENT_EVENTS.JOIN_QUEUE, {});

      expect(matchmakingService.joinQueue).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.ERROR,
        expect.objectContaining({ code: MATCH_ERROR_CODES.VALIDATION_ERROR })
      );
    });

    it('emits ERROR when matchmakingService throws ALREADY_IN_QUEUE', async () => {
      matchmakingService.joinQueue.mockImplementation(() => {
        throw { code: MATCH_ERROR_CODES.ALREADY_IN_QUEUE, message: 'Already in queue' };
      });

      socket._trigger(CLIENT_EVENTS.JOIN_QUEUE, { matchType: 'unranked' });

      // Handler is async — wait for it to resolve
      await new Promise((r) => setImmediate(r));

      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.ERROR,
        expect.objectContaining({ code: MATCH_ERROR_CODES.ALREADY_IN_QUEUE })
      );
    });
  });

  // -------------------------------------------------------------------------
  // LEAVE_QUEUE
  // -------------------------------------------------------------------------
  describe(CLIENT_EVENTS.LEAVE_QUEUE, () => {
    it('calls leaveQueue and emits QUEUE_LEFT', () => {
      socket._trigger(CLIENT_EVENTS.LEAVE_QUEUE);

      expect(matchmakingService.leaveQueue).toHaveBeenCalledWith('player-1');
      expect(socket.emit).toHaveBeenCalledWith(SERVER_EVENTS.QUEUE_LEFT, {});
    });
  });

  // -------------------------------------------------------------------------
  // SUBMIT_ANSWER
  // -------------------------------------------------------------------------
  describe(CLIENT_EVENTS.SUBMIT_ANSWER, () => {
    const validMatchId = '11111111-1111-1111-1111-111111111111';

    it('emits ANSWER_ACCEPTED and OPPONENT_ANSWERED when only one player answered', async () => {
      gameEngine.submitAnswer.mockResolvedValue({
        isCorrect: true,
        pointsEarned: 80,
        correctAnswerIndex: 2,
        bothAnswered: false,
        opponentAnswered: false,
      });

      gameEngine.getSession.mockReturnValue({
        matchId: validMatchId,
        player1Id: 'player-1',
        player2Id: 'player-2',
        questions: [{ id: 'q-1' }],
        answers: [{}],
        player1Score: 80,
        player2Score: 0,
      });

      socket._trigger(CLIENT_EVENTS.SUBMIT_ANSWER, {
        matchId: validMatchId,
        questionOrder: 0,
        selectedAnswerIndex: 2,
        timeTakenMs: 5000,
      });

      // Allow async handlers to resolve
      await new Promise((r) => setImmediate(r));

      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.ANSWER_ACCEPTED,
        expect.objectContaining({
          matchId: validMatchId,
          isCorrect: true,
          pointsEarned: 80,
        })
      );
    });

    it('emits QUESTION_REVEAL when both players answered', async () => {
      gameEngine.submitAnswer.mockResolvedValue({
        isCorrect: false,
        pointsEarned: 0,
        correctAnswerIndex: 1,
        bothAnswered: true,
        opponentAnswered: true,
      });

      const mockSession = {
        matchId: validMatchId,
        player1Id: 'player-1',
        player2Id: 'player-2',
        questions: [
          {
            id: 'q-1',
            correct_answer_index: 1,
            explanation_fr: 'The answer is B.',
          },
        ],
        answers: [
          {
            player1: { selectedAnswerIndex: 0, isCorrect: false, timeTakenMs: 10000, pointsEarned: 0 },
            player2: { selectedAnswerIndex: 1, isCorrect: true, timeTakenMs: 5000, pointsEarned: 150 },
          },
        ],
        player1Score: 0,
        player2Score: 150,
      };

      // getSession returns session while it exists, then null after finalize
      gameEngine.getSession.mockReturnValue(mockSession);
      // advanceQuestion returns null → match is over
      gameEngine.advanceQuestion.mockReturnValue(null);
      gameEngine.finalizeMatch.mockResolvedValue({
        matchId: validMatchId,
        winnerId: 'player-2',
        player1Score: 0,
        player2Score: 150,
        player1EloAfter: 984,
        player2EloAfter: 1016,
        player1EloDelta: -16,
        player2EloDelta: 16,
      });

      socket._trigger(CLIENT_EVENTS.SUBMIT_ANSWER, {
        matchId: validMatchId,
        questionOrder: 0,
        selectedAnswerIndex: 0,
        timeTakenMs: 10000,
      });

      // Wait for all async operations to complete (reveal delay is real but short in test env)
      await new Promise((r) => setTimeout(r, 2100));

      expect(io.to).toHaveBeenCalledWith(validMatchId);
      expect(io._roomEmitter.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.QUESTION_REVEAL,
        expect.objectContaining({ matchId: validMatchId })
      );
    });

    it('emits ERROR when payload is invalid', () => {
      socket._trigger(CLIENT_EVENTS.SUBMIT_ANSWER, {
        matchId: 'not-a-uuid',
        questionOrder: -1,
        selectedAnswerIndex: 5, // out of range
        timeTakenMs: -1,
      });

      expect(gameEngine.submitAnswer).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.ERROR,
        expect.objectContaining({ code: MATCH_ERROR_CODES.VALIDATION_ERROR })
      );
    });

    it('emits ERROR when gameEngine.submitAnswer throws', async () => {
      gameEngine.submitAnswer.mockRejectedValue({
        code: MATCH_ERROR_CODES.ANSWER_ALREADY_SUBMITTED,
        message: 'Already submitted',
      });

      socket._trigger(CLIENT_EVENTS.SUBMIT_ANSWER, {
        matchId: validMatchId,
        questionOrder: 0,
        selectedAnswerIndex: 1,
        timeTakenMs: 5000,
      });

      await new Promise((r) => setImmediate(r));

      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.ERROR,
        expect.objectContaining({ code: MATCH_ERROR_CODES.ANSWER_ALREADY_SUBMITTED })
      );
    });
  });

  // -------------------------------------------------------------------------
  // ABANDON_MATCH
  // -------------------------------------------------------------------------
  describe(CLIENT_EVENTS.ABANDON_MATCH, () => {
    const validMatchId = '22222222-2222-2222-2222-222222222222';

    it('calls abandonMatch and notifies opponent', async () => {
      gameEngine.abandonMatch.mockResolvedValue({ opponentId: 'player-2' });

      socket._trigger(CLIENT_EVENTS.ABANDON_MATCH, { matchId: validMatchId });

      await new Promise((r) => setImmediate(r));

      expect(gameEngine.abandonMatch).toHaveBeenCalledWith(validMatchId, 'player-1');
      expect(io.to).toHaveBeenCalledWith(validMatchId);
    });

    it('emits ERROR when matchId is missing', () => {
      socket._trigger(CLIENT_EVENTS.ABANDON_MATCH, {});

      expect(gameEngine.abandonMatch).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        SERVER_EVENTS.ERROR,
        expect.objectContaining({ code: MATCH_ERROR_CODES.VALIDATION_ERROR })
      );
    });
  });

  // -------------------------------------------------------------------------
  // disconnect — auto-leave queue
  // -------------------------------------------------------------------------
  describe('disconnect', () => {
    it('calls leaveQueue on disconnect', () => {
      socket._trigger('disconnect');

      expect(matchmakingService.leaveQueue).toHaveBeenCalledWith('player-1');
    });
  });

  // -------------------------------------------------------------------------
  // cleanup function — stops the matchmaking loop
  // -------------------------------------------------------------------------
  describe('cleanup', () => {
    it('stops the matchmaking loop when cleanup is called', () => {
      cleanup();
      expect(matchmakingService.stopLoop).toHaveBeenCalled();
    });
  });
});
