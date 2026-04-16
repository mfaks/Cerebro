import { Router } from 'express';
import type { Request, Response } from 'express';
import { publish } from '../queue/producer.js';
import type { TLEPayload } from '../types/types.js';

const router = Router();

// function to ingest a TLE payload
router.post('/tle', async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as TLEPayload;

  if (!payload.name || !payload.line1 || !payload.line2) {
    res.status(400).json({ error: 'name, line1, and line2 are required' });
    return;
  }

  // publish the TLE payload to RabbitMQ
  await publish('tle.ingest', payload);
  res.status(202).json({ message: 'TLE queued for processing' });
});

export default router;
