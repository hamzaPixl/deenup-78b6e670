// backend/src/__tests__/services/matchmakingService.test.ts
import { MatchmakingService } from '../../services/matchmakingService';

describe('MatchmakingService', () => {
  let service: MatchmakingService;

  beforeEach(() => {
    service = new MatchmakingService();
  });

  afterEach(() => {
    service.stopLoop();
  });

  describe('joinQueue', () => {
    it('should add a player to the queue', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      expect(service.isInQueue('player-1')).toBe(true);
    });

    it('should throw ALREADY_IN_QUEUE if player is already queued', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      expect(() => service.joinQueue('player-1', 'socket-2', 1000, 'ranked')).toThrow(
        expect.objectContaining({ code: 'ALREADY_IN_QUEUE' })
      );
    });

    it('should return queue size', () => {
      const size = service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      expect(size).toBe(1);
      const size2 = service.joinQueue('player-2', 'socket-2', 1000, 'ranked');
      expect(size2).toBe(2);
    });
  });

  describe('leaveQueue', () => {
    it('should remove a player from the queue', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      service.leaveQueue('player-1');
      expect(service.isInQueue('player-1')).toBe(false);
    });

    it('should not throw if player is not in queue', () => {
      expect(() => service.leaveQueue('nonexistent')).not.toThrow();
    });
  });

  describe('findMatch', () => {
    it('should match two players with similar ELO', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      service.joinQueue('player-2', 'socket-2', 1050, 'ranked');

      const match = service.findMatch('player-1');
      expect(match).not.toBeNull();
      expect(match?.opponentId).toBe('player-2');
    });

    it('should not match two players too far apart in ELO initially', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      service.joinQueue('player-2', 'socket-2', 2000, 'ranked');

      const match = service.findMatch('player-1');
      expect(match).toBeNull();
    });

    it('should return null if no opponent in queue', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      const match = service.findMatch('player-1');
      expect(match).toBeNull();
    });

    it('should remove both players from queue after match found', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      service.joinQueue('player-2', 'socket-2', 1050, 'ranked');

      service.findMatch('player-1');

      expect(service.isInQueue('player-1')).toBe(false);
      expect(service.isInQueue('player-2')).toBe(false);
    });

    it('should not match players with different match types', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      service.joinQueue('player-2', 'socket-2', 1000, 'unranked');

      const match = service.findMatch('player-1');
      expect(match).toBeNull();
    });
  });

  describe('expireTimedOutPlayers', () => {
    it('should return players who have been in queue longer than timeout', () => {
      // Manually create an entry with old joinedAt
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      // Force the entry's joinedAt to be old
      const entry = (service as any).queue.get('player-1');
      if (entry) {
        entry.joinedAt = new Date(Date.now() - 200_000); // 200 seconds ago
      }

      const expired = service.expireTimedOutPlayers();
      expect(expired).toContainEqual(
        expect.objectContaining({ playerId: 'player-1' })
      );
      expect(service.isInQueue('player-1')).toBe(false);
    });

    it('should not expire players still within timeout window', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      const expired = service.expireTimedOutPlayers();
      expect(expired).toHaveLength(0);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return correct count after joins and leaves', () => {
      service.joinQueue('player-1', 'socket-1', 1000, 'ranked');
      service.joinQueue('player-2', 'socket-2', 1000, 'ranked');
      expect(service.getQueueSize()).toBe(2);
      service.leaveQueue('player-1');
      expect(service.getQueueSize()).toBe(1);
    });
  });
});
