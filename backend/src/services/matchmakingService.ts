// backend/src/services/matchmakingService.ts
import { MatchType } from '@deenup/shared';
import { ELO, MATCHMAKING } from '@deenup/shared';
import { MATCH_ERROR_CODES } from '@deenup/shared';

export interface QueueEntry {
  playerId: string;
  socketId: string;
  elo: number;
  matchType: MatchType;
  themeId: string | null;
  joinedAt: Date;
  loopCount: number;
}

export interface MatchResult {
  opponentId: string;
  opponentSocketId: string;
  opponentElo: number;
  opponentMatchType: MatchType;
  opponentJoinedAt: Date;
  opponentLoopCount: number;
  themeId: string | null;
}

export class MatchmakingService {
  readonly queue: Map<string, QueueEntry> = new Map();
  private loopInterval: NodeJS.Timeout | null = null;

  joinQueue(
    playerId: string,
    socketId: string,
    elo: number,
    matchType: MatchType,
    themeId: string | null = null
  ): number {
    if (this.queue.has(playerId)) {
      throw {
        code: MATCH_ERROR_CODES.ALREADY_IN_QUEUE,
        message: `Player ${playerId} is already in the matchmaking queue`,
      };
    }
    this.queue.set(playerId, {
      playerId, socketId, elo, matchType, themeId,
      joinedAt: new Date(), loopCount: 0,
    });
    return this.queue.size;
  }

  leaveQueue(playerId: string): void {
    this.queue.delete(playerId);
  }

  isInQueue(playerId: string): boolean {
    return this.queue.has(playerId);
  }

  getQueueSize(): number {
    return this.queue.size;
  }

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

      this.queue.delete(playerId);
      this.queue.delete(candidateId);

      const resolvedThemeId = entry.themeId ?? candidate.themeId;

      return {
        opponentId: candidateId,
        opponentSocketId: candidate.socketId,
        opponentElo: candidate.elo,
        opponentMatchType: candidate.matchType,
        opponentJoinedAt: candidate.joinedAt,
        opponentLoopCount: candidate.loopCount,
        themeId: resolvedThemeId,
      };
    }

    if (entry) entry.loopCount++;
    return null;
  }

  // Fix H4: snapshot keys before iterating; Fix H17: preserve opponent's original data
  runMatchmakingPass(): Array<{ player1: QueueEntry; player2: QueueEntry }> {
    const matched: Array<{ player1: QueueEntry; player2: QueueEntry }> = [];
    const processedIds = new Set<string>();
    const playerIds = Array.from(this.queue.keys());

    for (const playerId of playerIds) {
      if (processedIds.has(playerId)) continue;
      if (!this.queue.has(playerId)) continue;

      const entry = this.queue.get(playerId)!;
      const result = this.findMatch(playerId);
      if (result) {
        processedIds.add(playerId);
        processedIds.add(result.opponentId);
        const opponentEntry: QueueEntry = {
          playerId: result.opponentId,
          socketId: result.opponentSocketId,
          elo: result.opponentElo,
          matchType: result.opponentMatchType,
          themeId: result.themeId,
          joinedAt: result.opponentJoinedAt,
          loopCount: result.opponentLoopCount,
        };
        matched.push({ player1: entry, player2: opponentEntry });
      }
    }

    return matched;
  }

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

  startLoop(
    onMatch: (player1: QueueEntry, player2: QueueEntry) => void,
    onTimeout: (entry: QueueEntry) => void
  ): void {
    if (this.loopInterval) return;
    this.loopInterval = setInterval(() => {
      const expired = this.expireTimedOutPlayers();
      for (const entry of expired) onTimeout(entry);
      const pairs = this.runMatchmakingPass();
      for (const { player1, player2 } of pairs) onMatch(player1, player2);
    }, MATCHMAKING.LOOP_INTERVAL_MS);
  }

  stopLoop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  private getEloWindow(loopCount: number): number {
    const expansions = Math.floor(loopCount / MATCHMAKING.WINDOW_EXPAND_INTERVAL_LOOPS);
    const window = ELO.MATCHMAKING_WINDOW_INITIAL + expansions * ELO.MATCHMAKING_WINDOW_STEP;
    return Math.min(window, ELO.MATCHMAKING_WINDOW_MAX);
  }
}
