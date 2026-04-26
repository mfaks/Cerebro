import { query } from '../db/client.js';
import type { SatelliteEvent } from '../types/types.js';

interface EventRow {
  id: string;
  type: string;
  asset_id: string;
  time: string;
  details: Record<string, unknown>;
}

export interface EventQuery {
  assetId?: string;
  type?: string;
}

export async function getAllEvents(q: EventQuery = {}): Promise<SatelliteEvent[]> {
  const params: unknown[] = [];

    // WHERE 1=1 lets every optional filter append AND since SQL only allows one WHERE clause
  let sql = `SELECT id, type, asset_id, occurred_at AS time, details FROM events WHERE 1=1`;

  // push the assetId filter to the SQL query if provided
  if (q.assetId) {
    params.push(q.assetId);
    sql += ` AND asset_id = $${params.length}`;
  }

  // push the type filter to the SQL query if provided
  if (q.type) {
    params.push(q.type);
    sql += ` AND type = $${params.length}`;
  }

  sql += ` ORDER BY occurred_at DESC`;

  // execute the SQL query and map the database rows to the SatelliteEvent shape
  const result = await query<EventRow>(sql, params);
  return result.rows.map((row) => ({
    id: row.id,
    type: row.type as SatelliteEvent['type'],
    assetId: row.asset_id,
    time: row.time,
    details: row.details,
  }));
}
