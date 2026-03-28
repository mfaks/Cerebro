import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/client.js', () => ({ query: vi.fn() }));

import { query } from '../db/client.js';
import { getAllCoverageZones } from '../services/coverageService.js';

const mockPolygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
};

describe('getAllCoverageZones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no zones exist', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    const result = await getAllCoverageZones();
    expect(result).toEqual([]);
  });

  it('maps DB rows to CoverageZone shape', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: 'zone-1',
          asset_id: '25544',
          polygon: JSON.stringify(mockPolygon),
          created_at: '2026-03-25T12:00:00Z',
        },
      ],
    });
    const result = await getAllCoverageZones();
    expect(result[0]).toEqual({
      id: 'zone-1',
      assetId: '25544',
      polygon: mockPolygon.coordinates[0],
      timestamp: '2026-03-25T12:00:00Z',
    });
  });

  it('queries coverage_zones table with PostGIS', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] });
    await getAllCoverageZones();
    expect(vi.mocked(query)).toHaveBeenCalledWith(
      expect.stringContaining('ST_AsGeoJSON'),
    );
  });
});
