import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../src/queue/producer.js', () => ({
  publish: vi.fn(),
}));

import { publish } from '../src/queue/producer.js';
import ingestRouter from '../src/routes/ingest.js';

const app = express();
app.use(express.json());
app.use('/', ingestRouter);

const validTLE = {
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   26085.50000000  .00001764  00000-0  40218-4 0  9993',
  line2: '2 25544  51.6416 247.4627 0006703  130.5360  325.0288 15.50377579499263',
};

describe('POST /ingest/tle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 202 and queues valid TLE payload', async () => {
    vi.mocked(publish).mockResolvedValue(undefined);
    const res = await request(app).post('/tle').send(validTLE);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ message: 'TLE queued for processing' });
    expect(publish).toHaveBeenCalledWith('tle.ingest', validTLE);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/tle').send({ name: 'ISS (ZARYA)' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name, line1, and line2 are required' });
    expect(publish).not.toHaveBeenCalled();
  });
});
