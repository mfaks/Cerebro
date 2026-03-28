import { Router } from 'express';
import type { Request, Response } from 'express';
import { getAllEvents } from '../services/eventService.js';

const router = Router();

// GET /api/v1/events
// Returns conjunction and overpass event feed.
// Query params: assetId, type (CONJUNCTION | OVERPASS)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const q = req.query;
  const filter: Parameters<typeof getAllEvents>[0] = {};
  if (typeof q['assetId'] === 'string') filter.assetId = q['assetId'];
  if (typeof q['type'] === 'string') filter.type = q['type'];
  const events = await getAllEvents(filter);
  res.json({ data: events, total: events.length });
});

export default router;
