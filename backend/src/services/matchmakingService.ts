// backend/src/services/matchmakingService.ts
import { MatchType } from '@deenup/shared';
import { ELO, MATCHMAKING } from '@deenup/shared';
import { MATCH_ERROR_CODES } from '@deenup/shared';

export interface QueueEntry {
  playerId: string;
  socketId: string;
  elo: number;
  matchType: MatchType;
  joinedAt: Date;
  /** How many loop iterations this player has been waiting */
  loopCount: number;
}

export interface MatchResult {
  opponentId: string;
  opponentSocketId: string;
  opponentElo: number;
}

/**
 * In-memory matchmaking queue.
 * No database access — purely ephemeral state.
 *
 * Matching algorithm:
 * - Players must have the same matchType (ranked/unranked)
 * - ELO window starts at MATCHMAKING_WINDOW_INITIAL (100)
 * - Window expands by WINDOW_STEP every WINDOW_EXPAND_INTERVAL_LOOPS iterations
 * - Maximum window: MATCHMAKING_WINDOW_MAX (500)
 */
export class MatchmakingService {
  // Map<playerId, QueueEntry>
  readonly queue: Map<string, QueueEntry> = new Map();
  private loopInterval: NodeJS.Timeout | null = null;

  // ---------------------------------------------------------------------------
  // Queue management
  // ---------------------------------------------------------------------------

  /**
   * Add a player to the matchmaking queue.
   * @returns The current queue size after joining
   */
  joinQueue(
    playerId: string,
    socketId: string,
    elo: number,
    matchType: MatchType
  ): number {
    if (this.queue.has(playerId)) {
      throw {
        code: MATCH_ERROR_CODES.ALREADY_IN_QUEUE,
        message: `Player ${playerId} is already in the matchmaking queue`,
      };
    }

    this.queue.set(playerId, {
      playerId,
      socketId,
      elo,
      matchType,
      joinedAt: new Date(),
      loopCount: 0,
    });

    return this.queue.size;
  }

  /**
   * Remove a player from the matchmaking queue.
   */
  leaveQueue(playerId: string): void {
    this.queue.delete(playerId);
  }

  /**
   * Check whether a player is currently in the queue.
   */
  isInQueue(playerId: string): boolean {
    return this.queue.has(playerId);
  }

  /**
   * Return the current number of players in the queue.
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  // ---------------------------------------------------------------------------
  // Matching
  // ---------------------------------------------------------------------------

  /**
   * Try to find a match for the given player.
   * If a match is found, both players are removed from the queue.
   *
   * @returns MatchResult if a match is found, or null if no suitable opponent
   */
  findMatch(playerId: string): MatchResult | null {
    const entry = this.queue.get(playerId);
    if (!entry) return null;

    const window = this.getEloWindow(entry.loopCount);
    const minElo = entry.elo - window;
    const maxElo = entry.elo + window;

    for (const [candidateId, candidate] of this.queue) {
      if (candidateId === playerId) continue;
      if (candidate.matchType !== entry.matchType) continue;
      if (candidate.elo < minElo || candidate.elo > maxElo) continue;

      // Match found — remove both from queue
      this.queue.delete(playerId);
      this.queue.delete(candidateId);

      return {
        opponentId: candidateId,
        opponentSocketId: candidate.socketId,
        opponentElo: candidate.elo,
      };
    }

    // No match — increment loop count for window expansion
    if (entry) entry.loopCount++;

    return null;
  }

  /**
   * Run a matchmaking pass for all players in queue.
   * Returns an array of matched pairs (each pair appears only once).
   */
  runMatchmakingPass(): Array<{ player1: QueueEntry; player2: QueueEntry }> {
    const matched: Array<{ player1: QueueEntry; player2: QueueEntry }> = [];
    const processedIds = new Set<string>();

    for (const [playerId, entry] of this.queue) {
      if (processedIds.has(playerId)) continue;

      const result = this.findMatch(playerId);
      if (result) {
        processedIds.add(playerId);
        processedIds.add(result.opponentId);
        matched.push({
          player1: entry,
          player2: {
            playerId: result.opponentId,
            socketId: result.opponentSocketId,
            elo: result.opponentElo,
            matchType: entry.matchType,
            joinedAt: new Date(),
            loopCount: 0,
          },
        });
      }
    }

    return matched;
  }

  // ---------------------------------------------------------------------------
  // Timeout management
  // ---------------------------------------------------------------------------

  /**
   * Find and remove players who have been waiting longer than QUEUE_TIMEOUT_SECONDS.
   * @returns Array of expired entries (so callers can notify them)
   */
  expireTimedOutPlayers(): QueueEntry[] {
    const now = Date.now();
    const timeoutMs = MATCHMAKING.QUEUE_TIMEOUT_SECONDS * 1000;
    const expired: QueueEntry[] = [];

    for (const [playerId, entry] of this.queue) {
      const waitTime = now - entry.joinedAt.getTime();
      if (waitTime >= timeoutMs) {
        expired.push(entry);
        this.queue.delete(playerId);
      }
    }

    return expired;
  }

  // ---------------------------------------------------------------------------
  // Background loop control (used by the socket handler)
  // ---------------------------------------------------------------------------

  startLoop(
    onMatch: (player1: QueueEntry, player2: QueueEntry) => void,
    onTimeout: (entry: QueueEntry) => void
  ): void {
    if (this.loopInterval) return; // already running

    this.loopInterval = setInterval(() => {
      // First expire timed-out players
      const expired = this.expireTimedOutPlayers();
      for (const entry of expired) {
        onTimeout(entry);
      }

      // Then run a matching pass
      const pairs = this.runMatchmakingPass();
      for (const { player1, player2 } of pairs) {
        onMatch(player1, player2);
      }
    }, MATCHMAKING.LOOP_INTERVAL_MS);
  }

  stopLoop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getEloWindow(loopCount: number): number {
    const expansions = Math.floor(loopCount / MATCHMAKING.WINDOW_EXPAND_INTERVAL_LOOPS);
    const window =
      ELO.MATCHMAKING_WINDOW_INITIAL + expansions * ELO.MATCHMAKING_WINDOW_STEP;
    return Math.min(window, ELO.MATCHMAKING_WINDOW_MAX);
  }
}
