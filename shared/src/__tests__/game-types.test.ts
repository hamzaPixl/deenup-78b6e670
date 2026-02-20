// shared/src/__tests__/game-types.test.ts
import {
  Theme,
  Question,
  QuestionSource,
  Match,
  MatchQuestion,
  MatchAnswer,
  EloHistory,
  DeenPointsTransaction,
  Profile,
  Conversation,
  Message,
  Salon,
  SalonMessage,
} from '../index';

describe('Game Types', () => {
  describe('Theme', () => {
    it('should accept a valid theme object', () => {
      const theme: Theme = {
        id: 'uuid-theme-1',
        slug: 'quran',
        name_fr: 'Coran',
        is_mvp: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(theme.slug).toBe('quran');
    });
  });

  describe('QuestionSource', () => {
    it('should accept a valid question source', () => {
      const source: QuestionSource = {
        id: 'uuid-src-1',
        question_id: 'uuid-q-1',
        source_type: 'quran',
        reference: 'Al-Baqarah:255',
        text_fr: 'Verset du Trône',
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(source.source_type).toBe('quran');
    });
  });

  describe('Question', () => {
    it('should accept a valid QCM question', () => {
      const question: Question = {
        id: 'uuid-q-1',
        theme_id: 'uuid-theme-1',
        difficulty: 'easy',
        question_fr: 'Combien de piliers de l\'islam?',
        answers: ['3', '4', '5', '6'],
        correct_answer_index: 2,
        explanation_fr: 'Les 5 piliers de l\'islam.',
        status: 'approved',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(question.difficulty).toBe('easy');
      expect(question.correct_answer_index).toBe(2);
    });
  });

  describe('Match', () => {
    it('should accept a valid match object', () => {
      const match: Match = {
        id: 'uuid-match-1',
        player1_id: 'uuid-player-1',
        player2_id: 'uuid-player-2',
        match_type: 'ranked',
        status: 'completed',
        winner_id: 'uuid-player-1',
        player1_score: 850,
        player2_score: 600,
        player1_elo_before: 1000,
        player2_elo_before: 990,
        player1_elo_after: 1015,
        player2_elo_after: 975,
        theme_id: 'uuid-theme-1',
        started_at: '2026-01-01T00:00:00Z',
        ended_at: '2026-01-01T00:05:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:05:00Z',
      };
      expect(match.match_type).toBe('ranked');
      expect(match.status).toBe('completed');
    });

    it('should allow null optional fields', () => {
      const match: Match = {
        id: 'uuid-match-1',
        player1_id: 'uuid-player-1',
        player2_id: null,
        match_type: 'ranked',
        status: 'waiting',
        winner_id: null,
        player1_score: 0,
        player2_score: 0,
        player1_elo_before: 1000,
        player2_elo_before: null,
        player1_elo_after: null,
        player2_elo_after: null,
        theme_id: null,
        started_at: null,
        ended_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(match.status).toBe('waiting');
    });
  });

  describe('MatchQuestion', () => {
    it('should accept a valid match question', () => {
      const mq: MatchQuestion = {
        id: 'uuid-mq-1',
        match_id: 'uuid-match-1',
        question_id: 'uuid-q-1',
        question_order: 1,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(mq.question_order).toBe(1);
    });
  });

  describe('MatchAnswer', () => {
    it('should accept a valid match answer', () => {
      const answer: MatchAnswer = {
        id: 'uuid-ans-1',
        match_id: 'uuid-match-1',
        match_question_id: 'uuid-mq-1',
        player_id: 'uuid-player-1',
        selected_answer_index: 2,
        is_correct: true,
        time_taken_ms: 5000,
        points_earned: 80,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(answer.is_correct).toBe(true);
    });

    it('should allow null selected_answer_index for timeouts', () => {
      const answer: MatchAnswer = {
        id: 'uuid-ans-2',
        match_id: 'uuid-match-1',
        match_question_id: 'uuid-mq-2',
        player_id: 'uuid-player-1',
        selected_answer_index: null,
        is_correct: false,
        time_taken_ms: 15000,
        points_earned: 0,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(answer.selected_answer_index).toBeNull();
    });
  });

  describe('EloHistory', () => {
    it('should accept a valid elo history record', () => {
      const elo: EloHistory = {
        id: 'uuid-elo-1',
        player_id: 'uuid-player-1',
        match_id: 'uuid-match-1',
        elo_before: 1000,
        elo_after: 1015,
        delta: 15,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(elo.delta).toBe(15);
    });
  });

  describe('DeenPointsTransaction', () => {
    it('should accept a valid points transaction', () => {
      const tx: DeenPointsTransaction = {
        id: 'uuid-tx-1',
        player_id: 'uuid-player-1',
        transaction_type: 'daily_play',
        amount: 10,
        balance_after: 60,
        match_id: null,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(tx.transaction_type).toBe('daily_play');
      expect(tx.amount).toBe(10);
    });
  });

  describe('Profile', () => {
    it('should accept a valid profile', () => {
      const profile: Profile = {
        id: 'uuid-user-1',
        display_name: 'TestUser',
        avatar_url: null,
        elo: 1000,
        deen_points: 50,
        total_matches: 0,
        total_wins: 0,
        win_streak: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(profile.elo).toBe(1000);
      expect(profile.deen_points).toBe(50);
    });
  });

  describe('Conversation', () => {
    it('should accept a valid conversation', () => {
      const conv: Conversation = {
        id: 'uuid-conv-1',
        player1_id: 'uuid-player-1',
        player2_id: 'uuid-player-2',
        last_message_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(conv.player1_id).toBe('uuid-player-1');
    });
  });

  describe('Message', () => {
    it('should accept a valid message', () => {
      const msg: Message = {
        id: 'uuid-msg-1',
        conversation_id: 'uuid-conv-1',
        sender_id: 'uuid-player-1',
        content: 'Assalamu alaikum!',
        reaction: null,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(msg.content).toBe('Assalamu alaikum!');
    });
  });

  describe('Salon', () => {
    it('should accept a valid salon', () => {
      const salon: Salon = {
        id: 'uuid-salon-1',
        slug: 'quran',
        name_fr: 'Coran',
        emoji: '📖',
        description: 'Discussions coraniques',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(salon.emoji).toBe('📖');
    });
  });

  describe('SalonMessage', () => {
    it('should accept a valid salon message', () => {
      const sm: SalonMessage = {
        id: 'uuid-sm-1',
        salon_id: 'uuid-salon-1',
        sender_id: 'uuid-player-1',
        content: 'BarakAllahu feek!',
        is_pinned: false,
        moderation_status: 'visible',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(sm.is_pinned).toBe(false);
      expect(sm.moderation_status).toBe('visible');
    });
  });
});
