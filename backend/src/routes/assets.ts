import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getAllAssets,
  getAssetById,
  getAssetTrack,
} from '../services/assetService.js';
import type { AssetQuery } from '../types/types.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const q = req.query;
  const query: AssetQuery = {};
  if (typeof q['type'] === 'string') query.type = q['type'];
  if (typeof q['region'] === 'string') query.region = q['region'];
  if (typeof q['startTime'] === 'string') query.startTime = q['startTime'];
  if (typeof q['endTime'] === 'string') query.endTime = q['endTime'];
  const assets = await getAllAssets(query);
  res.json({ data: assets, total: assets.length });
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const asset = await getAssetById(req.params.id);
  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }
  res.json(asset);
});

router.get('/:id/track', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const track = await getAssetTrack(req.params.id);
  if (!track) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }
  res.json(track);
});

export default router;
