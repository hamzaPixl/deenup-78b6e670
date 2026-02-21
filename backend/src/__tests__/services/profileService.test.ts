// backend/src/__tests__/services/profileService.test.ts
import { ProfileService } from '../../services/profileService';
import { AUTH_DEFAULTS } from '@deenup/shared';

const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

const mockSupabase = {
  from: mockFrom,
};

describe('ProfileService', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup fluent chain: from().insert().select().single()
    mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
      upsert: mockUpsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    });

    profileService = new ProfileService(mockSupabase as any);
  });

  describe('createProfile', () => {
    it('should create profile with default ELO and DeenUp points', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'uuid-1',
          display_name: 'Test',
          avatar_url: null,
          elo: AUTH_DEFAULTS.INITIAL_ELO,
          deen_points: AUTH_DEFAULTS.INITIAL_DEEN_POINTS,
          preferred_language: 'fr',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      });

      const profile = await profileService.createProfile('uuid-1', 'Test', null);
      expect(profile.elo).toBe(1000);
      expect(profile.deenPoints).toBe(50);
      expect(profile.displayName).toBe('Test');
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should throw INTERNAL_ERROR when insert fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(
        profileService.createProfile('uuid-1', 'Test', null)
      ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    });

    it('should map snake_case DB columns to camelCase User interface', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'uuid-2',
          display_name: 'Mapped User',
          avatar_url: 'https://example.com/avatar.jpg',
          elo: 1200,
          deen_points: 75,
          preferred_language: 'fr',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      });

      const profile = await profileService.createProfile('uuid-2', 'Mapped User', 'https://example.com/avatar.jpg');
      expect(profile.displayName).toBe('Mapped User');
      expect(profile.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(profile.createdAt).toBe('2026-01-01T00:00:00Z');
      expect(profile.updatedAt).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('getProfile', () => {
    it('should return profile for existing user', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'uuid-1',
          display_name: 'Test',
          avatar_url: null,
          elo: 1200,
          deen_points: 75,
          preferred_language: 'fr',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      });

      const profile = await profileService.getProfile('uuid-1');
      expect(profile.elo).toBe(1200);
      expect(profile.deenPoints).toBe(75);
    });

    it('should throw USER_NOT_FOUND for missing profile', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      await expect(profileService.getProfile('nonexistent')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
    });

    it('should throw USER_NOT_FOUND when data is null with no error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      await expect(profileService.getProfile('nonexistent')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('upsertProfileFromOAuth', () => {
    it('should upsert profile and return User', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'uuid-3',
          display_name: 'OAuth User',
          avatar_url: 'https://google.com/photo.jpg',
          elo: 1000,
          deen_points: 50,
          preferred_language: 'fr',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      });

      const profile = await profileService.upsertProfileFromOAuth(
        'uuid-3',
        'OAuth User',
        'https://google.com/photo.jpg'
      );
      expect(profile.displayName).toBe('OAuth User');
      expect(profile.avatarUrl).toBe('https://google.com/photo.jpg');
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should throw INTERNAL_ERROR when upsert fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Upsert error' },
      });

      await expect(
        profileService.upsertProfileFromOAuth('uuid-3', 'OAuth User', null)
      ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    });
  });
});
