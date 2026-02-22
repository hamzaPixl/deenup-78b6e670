// shared/src/__tests__/types/websocket.test.ts
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../types/websocket';

describe('WebSocket Event Constants', () => {
  describe('CLIENT_EVENTS', () => {
    it('should define JOIN_QUEUE event', () => {
      expect(CLIENT_EVENTS.JOIN_QUEUE).toBe('match:join_queue');
    });

    it('should define LEAVE_QUEUE event', () => {
      expect(CLIENT_EVENTS.LEAVE_QUEUE).toBe('match:leave_queue');
    });

    it('should define SUBMIT_ANSWER event', () => {
      expect(CLIENT_EVENTS.SUBMIT_ANSWER).toBe('match:submit_answer');
    });

    it('should define ABANDON_MATCH event', () => {
      expect(CLIENT_EVENTS.ABANDON_MATCH).toBe('match:abandon');
    });

    it('should define rematch events', () => {
      expect(CLIENT_EVENTS.REQUEST_REMATCH).toBeDefined();
      expect(CLIENT_EVENTS.ACCEPT_REMATCH).toBeDefined();
      expect(CLIENT_EVENTS.DECLINE_REMATCH).toBeDefined();
    });
  });

  describe('SERVER_EVENTS', () => {
    it('should define QUEUE_JOINED event', () => {
      expect(SERVER_EVENTS.QUEUE_JOINED).toBe('match:queue_joined');
    });

    it('should define MATCH_FOUND event', () => {
      expect(SERVER_EVENTS.MATCH_FOUND).toBe('match:found');
    });

    it('should define QUESTION_START event', () => {
      expect(SERVER_EVENTS.QUESTION_START).toBe('match:question_start');
    });

    it('should define MATCH_ENDED event', () => {
      expect(SERVER_EVENTS.MATCH_ENDED).toBe('match:ended');
    });

    it('should define ERROR event', () => {
      expect(SERVER_EVENTS.ERROR).toBe('match:error');
    });

    it('should define OPPONENT_ANSWERED event', () => {
      expect(SERVER_EVENTS.OPPONENT_ANSWERED).toBe('match:opponent_answered');
    });

    it('should define all question/answer lifecycle events', () => {
      expect(SERVER_EVENTS.QUESTION_START).toBeDefined();
      expect(SERVER_EVENTS.QUESTION_REVEAL).toBeDefined();
      expect(SERVER_EVENTS.ANSWER_ACCEPTED).toBeDefined();
    });
  });

  describe('Event namespacing', () => {
    it('all client events should start with match:', () => {
      for (const event of Object.values(CLIENT_EVENTS)) {
        expect(event).toMatch(/^match:/);
      }
    });

    it('all server events should start with match:', () => {
      for (const event of Object.values(SERVER_EVENTS)) {
        expect(event).toMatch(/^match:/);
      }
    });

    it('client and server events should not share names (no accidental overlap)', () => {
      const clientSet = new Set<string>(Object.values(CLIENT_EVENTS));
      const serverValues = Object.values(SERVER_EVENTS) as string[];
      for (const ev of serverValues) {
        expect(clientSet.has(ev)).toBe(false);
      }
    });
  });
});
