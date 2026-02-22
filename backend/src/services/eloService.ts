// backend/src/services/eloService.ts
import { ELO } from '@deenup/shared';

export type MatchOutcome = 'win' | 'loss' | 'draw';

export interface EloChangeResult {
  /** Delta applied to the winner (positive) */
  winnerDelta: number;
  /** Delta applied to the loser (negative or 0 on draw) */
  loserDelta: number;
}

export interface EloApplyResult {
  winnerNewElo: number;
  loserNewElo: number;
  winnerDelta: number;
  loserDelta: number;
}

/**
 * Pure ELO calculation service.
 * No database access — all methods are deterministic and side-effect-free.
 *
 * Formula: E = 1 / (1 + 10^((opponentRating - playerRating) / 400))
 * Delta:   K * (actualScore - expectedScore)
 */
export class EloService {
  /**
   * Calculate the expected score (probability of winning) for a player.
   * @param playerRating  - The rating of the player in question
   * @param opponentRating - The rating of the opponent
   * @returns A value in (0, 1)
   */
  calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Calculate ELO deltas for both players after a match.
   *
   * @param winnerRating - ELO of the match winner (or player1 on draw)
   * @param loserRating  - ELO of the match loser (or player2 on draw)
   * @param outcome      - 'win', 'loss', or 'draw'
   *
   * Note: outcome is always from the perspective of the first argument (winnerRating).
   * - 'win':  first arg won
   * - 'loss': first arg lost (loserDelta will be positive for the second player)
   * - 'draw': both players got 0.5 actual score
   */
  calculateEloChange(
    winnerRating: number,
    loserRating: number,
    outcome: MatchOutcome
  ): EloChangeResult {
    const K = ELO.K_FACTOR;

    const expectedWinner = this.calculateExpectedScore(winnerRating, loserRating);
    const expectedLoser = this.calculateExpectedScore(loserRating, winnerRating);

    let actualWinner: number;
    let actualLoser: number;

    switch (outcome) {
      case 'win':
        actualWinner = 1;
        actualLoser = 0;
        break;
      case 'loss':
        actualWinner = 0;
        actualLoser = 1;
        break;
      case 'draw':
        actualWinner = 0.5;
        actualLoser = 0.5;
        break;
    }

    const winnerDelta = Math.round(K * (actualWinner - expectedWinner));
    const loserDelta = Math.round(K * (actualLoser - expectedLoser));

    // Ensure the winner's new ELO doesn't go below MIN_RATING
    // We clamp the loser delta so that loserRating + loserDelta >= MIN_RATING
    const clampedLoserDelta = Math.max(loserDelta, ELO.MIN_RATING - loserRating);

    return {
      winnerDelta,
      loserDelta: clampedLoserDelta,
    };
  }

  /**
   * Calculate new ELO ratings for both players and return them.
   *
   * @param winnerCurrentElo - Current ELO of the winner
   * @param loserCurrentElo  - Current ELO of the loser
   * @param outcome          - Match outcome from winner's perspective
   */
  applyEloChange(
    winnerCurrentElo: number,
    loserCurrentElo: number,
    outcome: MatchOutcome
  ): EloApplyResult {
    const { winnerDelta, loserDelta } = this.calculateEloChange(
      winnerCurrentElo,
      loserCurrentElo,
      outcome
    );

    const winnerNewElo = Math.max(ELO.MIN_RATING, winnerCurrentElo + winnerDelta);
    const loserNewElo = Math.max(ELO.MIN_RATING, loserCurrentElo + loserDelta);

    return {
      winnerNewElo,
      loserNewElo,
      winnerDelta,
      loserDelta,
    };
  }
}
