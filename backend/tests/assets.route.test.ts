import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../src/services/assetService.js', () => ({
  getAllAssets: vi.fn(),
  getAssetById: vi.fn(),
  getAssetTrack: vi.fn(),
}));

import { getAllAssets, getAssetById, getAssetTrack } from '../src/services/assetService.js';
import assetsRouter from '../src/routes/assets.js';

const app = express();
app.use(express.json());
app.use('/', assetsRouter);

const mockAsset = {
  id: '25544',
  name: 'ISS (ZARYA)',
  type: 'PAYLOAD',
  status: 'ACTIVE',
  position: { latitude: 51.6, longitude: -120.3, altitude: 408.5 },
  velocity: { speed: 7.66, heading: 51.6 },
  lastUpdated: '2026-03-25T12:00:00Z',
  metadata: { country: 'US', launchDate: '1998-11-20', rcsSize: 'LARGE' },
};

describe('GET /assets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with data and total', async () => {
    vi.mocked(getAllAssets).mockResolvedValue([mockAsset] as never);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [mockAsset], total: 1 });
  });

  it('passes type query param to service', async () => {
    vi.mocked(getAllAssets).mockResolvedValue([]);
    await request(app).get('/?type=DEBRIS');
    expect(getAllAssets).toHaveBeenCalledWith(expect.objectContaining({ type: 'DEBRIS' }));
  });
});

describe('GET /assets/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with asset when found', async () => {
    vi.mocked(getAssetById).mockResolvedValue(mockAsset as never);
    const res = await request(app).get('/25544');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('25544');
  });

  it('returns 404 when asset not found', async () => {
    vi.mocked(getAssetById).mockResolvedValue(null);
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Asset not found' });
  });
});

describe('GET /assets/:id/track', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with track when asset exists', async () => {
    vi.mocked(getAssetTrack).mockResolvedValue({ assetId: '25544', points: [] } as never);
    const res = await request(app).get('/25544/track');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ assetId: '25544', points: [] });
  });

  it('returns 404 when asset not found', async () => {
    vi.mocked(getAssetTrack).mockResolvedValue(null);
    const res = await request(app).get('/unknown/track');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Asset not found' });
  });
});
