import { Router } from 'express';
import type { Request, Response } from 'express';
import type { CoverageZone } from '../types/types.js';

const router = Router();

// GET /api/v1/coverage
// Returns coverage zone polygons for all sensor assets.
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const zones: CoverageZone[] = [];
  res.json({ data: zones, total: zones.length });
});

export default router;
