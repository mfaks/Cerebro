import { Router } from 'express';
import type { Request, Response } from 'express';
import type { SatelliteEvent } from '../types/types.js';

const router = Router();

// GET /api/v1/events
// Returns conjunction and overpass event feed.
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const events: SatelliteEvent[] = [];
  res.json({ data: events, total: events.length });
});

export default router;
