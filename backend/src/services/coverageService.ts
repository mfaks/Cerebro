import { query } from '../db/client.js';
import type { CoverageZone } from '../types/types.js';

interface CoverageRow {
  id: string;
  asset_id: string;
  polygon: string;
  created_at: string;
}

// Fetch all coverage zones from the database, ordered by creation time descending
export async function getAllCoverageZones(): Promise<CoverageZone[]> {
  const result = await query<CoverageRow>(
    `SELECT id, asset_id, ST_AsGeoJSON(polygon) AS polygon, created_at
     FROM coverage_zones
     ORDER BY created_at DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    polygon: (JSON.parse(row.polygon) as { coordinates: number[][][] }).coordinates[0] ?? [],
    timestamp: row.created_at,
  }));
}
