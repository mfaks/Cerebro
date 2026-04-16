import { Router } from 'express';
import type { Request, Response } from 'express';
import { getAllCoverageZones } from '../services/coverageService.js';

const router = Router();

// function to get all coverage zones
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const zones = await getAllCoverageZones();
  res.json({ data: zones, total: zones.length });
});

export default router;
