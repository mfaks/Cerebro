import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/db/client.js', () => ({ query: vi.fn() }));

import { query } from '../src/db/client.js';
import { getAllEvents } from '../src/services/eventService.js';

const mockRow = {
  id: 'evt-1',
  type: 'CONJUNCTION',
  asset_id: '25544',
  time: '2026-03-25T12:00:00Z',
  details: { probability: 0.001 },
};

describe('getAllEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no events exist', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    const result = await getAllEvents();
    expect(result).toEqual([]);
  });

  it('maps DB rows to SatelliteEvent shape', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [mockRow] });
    const result = await getAllEvents();
    expect(result[0]).toEqual({
      id: 'evt-1',
      type: 'CONJUNCTION',
      assetId: '25544',
      time: '2026-03-25T12:00:00Z',
      details: { probability: 0.001 },
    });
  });

  it('filters by assetId', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    await getAllEvents({ assetId: '25544' });
    expect(vi.mocked(query)).toHaveBeenCalledWith(
      expect.stringContaining('asset_id = $1'),
      ['25544'],
    );
  });

  it('filters by type', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    await getAllEvents({ type: 'OVERPASS' });
    expect(vi.mocked(query)).toHaveBeenCalledWith(
      expect.stringContaining('type = $1'),
      ['OVERPASS'],
    );
  });

  it('filters by both assetId and type', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    await getAllEvents({ assetId: '25544', type: 'CONJUNCTION' });
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('asset_id = $1');
    expect(sql).toContain('type = $2');
    expect(params).toEqual(['25544', 'CONJUNCTION']);
  });
});
