import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { CoverageZone } from '../src/types/types.js';

vi.mock('../src/services/coverageService.js', () => ({
  getAllCoverageZones: vi.fn(),
}));

import { getAllCoverageZones } from '../src/services/coverageService.js';
import coverageRouter from '../src/routes/coverage.js';

const app = express();
app.use(express.json());
app.use('/', coverageRouter);

describe('GET /coverage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with empty data when no zones exist', async () => {
    vi.mocked(getAllCoverageZones).mockResolvedValue([]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], total: 0 });
  });

  it('returns 200 with zones and correct total', async () => {
    const mockZone: CoverageZone = {
      id: 'zone-1',
      assetId: '25544',
      polygon: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
      timestamp: '2026-03-25T12:00:00Z',
    };
    vi.mocked(getAllCoverageZones).mockResolvedValue([mockZone]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [mockZone], total: 1 });
  });
});
