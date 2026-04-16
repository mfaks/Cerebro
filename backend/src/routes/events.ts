import { Router } from 'express';
import type { Request, Response } from 'express';
import { getAllEvents } from '../services/eventService.js';

const router = Router();

// function to get all events
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const q = req.query;
  const filter: Parameters<typeof getAllEvents>[0] = {};
  // repeated query params arrive as arrays in Express; only accept plain string values
  if (typeof q['assetId'] === 'string') filter.assetId = q['assetId'];
  if (typeof q['type'] === 'string') filter.type = q['type'];
  const events = await getAllEvents(filter);
  res.json({ data: events, total: events.length });
});

export default router;
