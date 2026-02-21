// backend/src/services/profileService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { User, AUTH_ERROR_CODES, AUTH_DEFAULTS } from '@deenup/shared';

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async createProfile(
    userId: string,
    displayName: string,
    avatarUrl: string | null
  ): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        elo: AUTH_DEFAULTS.INITIAL_ELO,
        deen_points: AUTH_DEFAULTS.INITIAL_DEEN_POINTS,
        preferred_language: 'fr',
      })
      .select()
      .single();

    if (error) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    return this.mapProfile(data);
  }

  async getProfile(userId: string): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw { code: AUTH_ERROR_CODES.USER_NOT_FOUND, message: 'Profil introuvable' };
    }

    return this.mapProfile(data);
  }

  async upsertProfileFromOAuth(
    userId: string,
    displayName: string,
    avatarUrl: string | null
  ): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        elo: AUTH_DEFAULTS.INITIAL_ELO,
        deen_points: AUTH_DEFAULTS.INITIAL_DEEN_POINTS,
        preferred_language: 'fr',
      })
      .select()
      .single();

    if (error) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    return this.mapProfile(data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProfile(row: any): User {
    return {
      id: row.id,
      email: row.email ?? '',
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      elo: row.elo,
      deenPoints: row.deen_points,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
