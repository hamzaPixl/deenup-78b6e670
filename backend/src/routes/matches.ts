// backend/src/routes/matches.ts
import { Router, Request, Response } from 'express';
import { MATCH_ERROR_CODES } from '@deenup/shared';
import { MatchService } from '../services/matchService';
import { authenticateUser } from '../middleware/auth';
import { validateMatchId, validateHistoryQuery } from '../validators/match';

const ERROR_STATUS_MAP: Record<string, number> = {
  [MATCH_ERROR_CODES.MATCH_NOT_FOUND]: 404,
  [MATCH_ERROR_CODES.NOT_MATCH_PARTICIPANT]: 403,
  [MATCH_ERROR_CODES.VALIDATION_ERROR]: 400,
  [MATCH_ERROR_CODES.INTERNAL_ERROR]: 500,
};

function handleError(res: Response, err: any): void {
  const code = err.code ?? MATCH_ERROR_CODES.INTERNAL_ERROR;
  const status = ERROR_STATUS_MAP[code] ?? 500;
  res.status(status).json({ error: { code, message: err.message ?? 'Erreur interne' } });
}

export function createMatchesRouter(matchService: MatchService): Router {
  const router = Router();

  /**
   * GET /api/matches
   * Returns paginated match history for the authenticated user.
   * Query params: page (default: 1), pageSize (default: 10, max: 100)
   */
  router.get('/', authenticateUser, async (req: Request, res: Response) => {
    const validation = validateHistoryQuery(req.query);
    if (!validation.success) {
      res.status(400).json({
        error: {
          code: MATCH_ERROR_CODES.VALIDATION_ERROR,
          message: 'Paramètres de pagination invalides',
          details: validation.errors,
        },
      });
      return;
    }

    const page = parseInt(String(req.query['page'] ?? '1'), 10);
    const pageSize = parseInt(String(req.query['pageSize'] ?? '10'), 10);
    const playerId = (req as any).user.id;

    try {
      const result = await matchService.getMatchHistory(playerId, { page, pageSize });
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  /**
   * GET /api/matches/:matchId
   * Returns match details and answers for the given match (authenticated).
   */
  router.get('/:matchId', authenticateUser, async (req: Request, res: Response) => {
    const validation = validateMatchId(req.params.matchId);
    if (!validation.success) {
      res.status(400).json({
        error: {
          code: MATCH_ERROR_CODES.VALIDATION_ERROR,
          message: 'matchId invalide',
          details: validation.errors,
        },
      });
      return;
    }

    const { matchId } = req.params;
    const playerId = (req as any).user.id;

    try {
      const [match, answers] = await Promise.all([
        matchService.getMatchById(matchId),
        matchService.getMatchAnswers(matchId),
      ]);

      // Ensure the requesting user is a participant in this match
      if (match.player1_id !== playerId && match.player2_id !== playerId) {
        res.status(403).json({
          error: {
            code: MATCH_ERROR_CODES.NOT_MATCH_PARTICIPANT,
            message: 'Vous ne participez pas à ce match',
          },
        });
        return;
      }

      res.status(200).json({ match, answers });
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}
