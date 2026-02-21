// backend/src/services/deenPointsService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { DEEN_POINTS } from '@deenup/shared';
import { MATCH_ERROR_CODES } from '@deenup/shared';
import type { PointsTransactionType } from '@deenup/shared';

export class DeenPointsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Award match win reward to the winner.
   * @returns The new balance after award
   */
  async awardMatchWin(playerId: string, matchId: string): Promise<number> {
    return this.creditPoints(playerId, matchId, 'match_win', DEEN_POINTS.MATCH_WIN_REWARD);
  }

  /**
   * Award fast answer reward to a player who answered quickly.
   * @returns The new balance after award
   */
  async awardFastAnswer(playerId: string, matchId: string): Promise<number> {
    return this.creditPoints(playerId, matchId, 'fast_answer', DEEN_POINTS.FAST_ANSWER_REWARD);
  }

  /**
   * Award daily play reward.
   * @returns The new balance after award
   */
  async awardDailyPlay(playerId: string): Promise<number> {
    return this.creditPoints(playerId, null, 'daily_play', DEEN_POINTS.DAILY_PLAY_REWARD);
  }

  /**
   * Get current DeenPoints balance for a player.
   */
  async getBalance(playerId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('deen_points')
      .eq('id', playerId)
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to fetch DeenPoints balance for ${playerId}: ${error?.message ?? 'No data'}`,
      };
    }

    return (data as { deen_points: number }).deen_points;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async creditPoints(
    playerId: string,
    matchId: string | null,
    transactionType: PointsTransactionType,
    amount: number
  ): Promise<number> {
    // 1. Fetch current balance
    const currentBalance = await this.getBalance(playerId);
    const newBalance = currentBalance + amount;

    // 2. Update profile balance
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ deen_points: newBalance })
      .eq('id', playerId)
      .single();

    if (error) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to update DeenPoints for ${playerId}: ${error.message}`,
      };
    }

    const updatedBalance = (data as { deen_points: number } | null)?.deen_points ?? newBalance;

    // 3. Insert transaction record (non-blocking — log errors but don't throw)
    await this.supabase.from('deen_points_transactions').insert({
      player_id: playerId,
      transaction_type: transactionType,
      amount,
      balance_after: updatedBalance,
      match_id: matchId,
    });

    return updatedBalance;
  }
}
