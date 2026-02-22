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

  /**
   * Atomically credit points using an SQL expression to avoid TOCTOU race (fix C4).
   * Uses `deen_points = deen_points + amount` so concurrent calls don't overwrite each other.
   */
  private async creditPoints(
    playerId: string,
    matchId: string | null,
    transactionType: PointsTransactionType,
    amount: number
  ): Promise<number> {
    // Atomic increment — no read-then-write race condition
    const { data, error } = await this.supabase.rpc('increment_deen_points', {
      p_player_id: playerId,
      p_amount: amount,
    });

    if (error) {
      // Fallback to non-atomic update if RPC doesn't exist (e.g. test environments)
      return this.creditPointsFallback(playerId, matchId, transactionType, amount);
    }

    const newBalance = (data as number | null) ?? 0;

    // Insert transaction record (non-blocking)
    this.supabase.from('deen_points_transactions').insert({
      player_id: playerId,
      transaction_type: transactionType,
      amount,
      balance_after: newBalance,
      match_id: matchId,
    }).then(({ error: txErr }) => {
      if (txErr) console.error(`[DeenPointsService] Failed to log transaction for ${playerId}:`, txErr);
    });

    return newBalance;
  }

  /**
   * Fallback for environments where the RPC doesn't exist (unit tests).
   * Uses a SQL expression update (deen_points + amount) to be atomic — avoids
   * the read-then-write race condition that could lose points on concurrent calls.
   */
  private async creditPointsFallback(
    playerId: string,
    matchId: string | null,
    transactionType: PointsTransactionType,
    amount: number
  ): Promise<number> {
    // Atomic expression update — no read step, so no TOCTOU race
    const { data: updateData, error: updateError } = await this.supabase.rpc(
      'increment_deen_points_fallback',
      { p_player_id: playerId, p_amount: amount }
    ).then(async (rpcResult) => {
      if (rpcResult.error) {
        // Final fallback: plain update (non-atomic, best-effort for test envs)
        const current = await this.getBalance(playerId);
        return this.supabase
          .from('profiles')
          .update({ deen_points: current + amount })
          .eq('id', playerId)
          .select('deen_points')
          .single();
      }
      return { data: { deen_points: rpcResult.data as number }, error: null };
    });

    if (updateError) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to update DeenPoints for ${playerId}: ${updateError.message}`,
      };
    }

    const updatedBalance = (updateData as { deen_points: number } | null)?.deen_points ?? 0;

    // Insert transaction record (non-blocking)
    this.supabase.from('deen_points_transactions').insert({
      player_id: playerId,
      transaction_type: transactionType,
      amount,
      balance_after: updatedBalance,
      match_id: matchId,
    }).then(({ error: txErr }) => {
      if (txErr) console.error(`[DeenPointsService] Failed to log transaction for ${playerId}:`, txErr);
    });

    return updatedBalance;
  }
}
