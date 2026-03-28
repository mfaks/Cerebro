import { Router } from 'express';
import type { Request, Response } from 'express';
import { publish } from '../queue/producer.js';
import type { TLEPayload } from '../types/types.js';

const router = Router();

// POST /api/v1/ingest/tle
// Accepts a TLE payload and publishes it to the RabbitMQ exchange.
router.post('/tle', async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as TLEPayload;

  if (!payload.name || !payload.line1 || !payload.line2) {
    res.status(400).json({ error: 'name, line1, and line2 are required' });
    return;
  }

  await publish('tle.ingest', payload);
  res.status(202).json({ message: 'TLE queued for processing' });
});

export default router;
