import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/db/client.js', () => ({ query: vi.fn() }));

import { query } from '../src/db/client.js';
import { getAllAssets, getAssetById } from '../src/services/assetService.js';

const mockRow = {
  id: '25544',
  name: 'ISS (ZARYA)',
  type: 'PAYLOAD',
  status: 'ACTIVE',
  latitude: 51.6,
  longitude: -120.3,
  altitude: 408.5,
  speed: 7.66,
  heading: 51.6,
  country: 'US',
  launch_date: '1998-11-20',
  rcs_size: 'LARGE',
  last_updated: '2026-03-25T12:00:00Z',
};

describe('getAllAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped assets from the database', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [mockRow] });
    const result = await getAllAssets({});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '25544',
      name: 'ISS (ZARYA)',
      type: 'PAYLOAD',
      position: { latitude: 51.6, longitude: -120.3, altitude: 408.5 },
      velocity: { speed: 7.66, heading: 51.6 },
    });
  });

  it('returns empty array when no assets found', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    const result = await getAllAssets({});
    expect(result).toEqual([]);
  });

  it('appends type filter to SQL', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    await getAllAssets({ type: 'DEBRIS' });
    expect(vi.mocked(query)).toHaveBeenCalledWith(
      expect.stringContaining('type = $1'),
      ['DEBRIS'],
    );
  });

  it('appends time range filters to SQL', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    await getAllAssets({ startTime: '2026-01-01', endTime: '2026-12-31' });
    const [sql, params] = vi.mocked(query).mock.calls[0]!;
    expect(sql).toContain('last_updated >=');
    expect(sql).toContain('last_updated <=');
    expect(params).toEqual(['2026-01-01', '2026-12-31']);
  });
});

describe('getAssetById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when asset not found', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    const result = await getAssetById('nonexistent');
    expect(result).toBeNull();
  });

  it('returns asset when found', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [mockRow] });
    const result = await getAssetById('25544');
    expect(result?.id).toBe('25544');
    expect(result?.metadata).toEqual({
      country: 'US',
      launchDate: '1998-11-20',
      rcsSize: 'LARGE',
    });
  });
});
