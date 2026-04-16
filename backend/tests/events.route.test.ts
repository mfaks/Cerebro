import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { SatelliteEvent } from '../src/types/types.js';

vi.mock('../src/services/eventService.js', () => ({
  getAllEvents: vi.fn(),
}));

import { getAllEvents } from '../src/services/eventService.js';
import eventsRouter from '../src/routes/events.js';

const app = express();
app.use(express.json());
app.use('/', eventsRouter);

const mockEvent: SatelliteEvent = {
  id: 'evt-1',
  type: 'CONJUNCTION',
  assetId: '25544',
  time: '2026-03-25T12:00:00Z',
  details: { probability: 0.001 },
};

describe('GET /events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with data and total', async () => {
    vi.mocked(getAllEvents).mockResolvedValue([mockEvent]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [mockEvent], total: 1 });
  });

  it('passes assetId and type filters to service', async () => {
    vi.mocked(getAllEvents).mockResolvedValue([]);
    await request(app).get('/?assetId=25544&type=CONJUNCTION');
    expect(getAllEvents).toHaveBeenCalledWith({ assetId: '25544', type: 'CONJUNCTION' });
  });
});
