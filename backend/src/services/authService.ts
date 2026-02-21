// backend/src/services/authService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AuthSession,
  SignupRequest,
  LoginRequest,
  User,
  AUTH_ERROR_CODES,
} from '@deenup/shared';
import { ProfileService } from './profileService';

export class AuthService {
  constructor(
    private supabase: SupabaseClient,
    private profileService: ProfileService
  ) {}

  async signup(input: SignupRequest): Promise<{ session: AuthSession }> {
    const { data, error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      if (error.message?.includes('already registered') || (error as any).status === 422) {
        throw { code: AUTH_ERROR_CODES.EMAIL_EXISTS, message: 'Cet e-mail est déjà utilisé' };
      }
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    if (!data.user || !data.session) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: 'Échec de la création du compte' };
    }

    const profile = await this.profileService.createProfile(
      data.user.id,
      input.displayName,
      null
    );

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
        user: { ...profile, email: data.user.email ?? input.email },
      },
    };
  }

  async login(input: LoginRequest): Promise<{ session: AuthSession }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw { code: AUTH_ERROR_CODES.INVALID_CREDENTIALS, message: 'Identifiants incorrects' };
    }

    if (!data.user || !data.session) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: 'Échec de connexion' };
    }

    const profile = await this.profileService.getProfile(data.user.id);

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
        user: { ...profile, email: data.user.email ?? input.email },
      },
    };
  }

  async logout(_accessToken: string): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Always succeed to prevent email enumeration
    await this.supabase.auth.resetPasswordForEmail(email);
  }

  async confirmPasswordReset(_token: string, newPassword: string): Promise<void> {
    // NOTE: Password reset confirmation via updateUser requires the user to have
    // an active session from the reset link callback. This endpoint serves as
    // the server-side handler; client-side Supabase SDK typically handles the
    // deep link and session, then calls this endpoint.
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw { code: AUTH_ERROR_CODES.INVALID_TOKEN, message: 'Lien de réinitialisation invalide ou expiré' };
    }
  }

  async getMe(accessToken: string): Promise<{ user: User }> {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      throw { code: AUTH_ERROR_CODES.INVALID_TOKEN, message: 'Token invalide' };
    }
    const profile = await this.profileService.getProfile(data.user.id);
    return { user: { ...profile, email: data.user.email ?? '' } };
  }

  async syncSocialProfile(
    userId: string,
    displayName: string,
    avatarUrl: string | null
  ): Promise<{ user: User }> {
    const profile = await this.profileService.upsertProfileFromOAuth(
      userId,
      displayName,
      avatarUrl
    );
    return { user: profile };
  }
}
