import { query } from '../db/client.js';
import type { CoverageZone } from '../types/types.js';

interface CoverageRow {
  id: string;
  asset_id: string;
  polygon: string;
  created_at: string;
}

// function to get all coverage zones
export async function getAllCoverageZones(): Promise<CoverageZone[]> {
  const result = await query<CoverageRow>(
    `SELECT id, asset_id, ST_AsGeoJSON(polygon) AS polygon, created_at
     FROM coverage_zones
     ORDER BY created_at DESC`,
  );

  // map the database rows to the CoverageZone shape
  return result.rows.map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    polygon: (JSON.parse(row.polygon) as { coordinates: number[][][] }).coordinates[0] ?? [],
    timestamp: row.created_at,
  }));
}
