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

// Fetch all events from the database, optionally filtered by asset ID and/or event type, ordered by time descending
export async function getAllEvents(q: EventQuery = {}): Promise<SatelliteEvent[]> {
  const params: unknown[] = [];
  let sql = `SELECT id, type, asset_id, time, details FROM events WHERE 1=1`;

  if (q.assetId) {
    params.push(q.assetId);
    sql += ` AND asset_id = $${params.length}`;
  }
  if (q.type) {
    params.push(q.type);
    sql += ` AND type = $${params.length}`;
  }

  sql += ` ORDER BY time DESC`;

  const result = await query<EventRow>(sql, params);
  return result.rows.map((row) => ({
    id: row.id,
    type: row.type as SatelliteEvent['type'],
    assetId: row.asset_id,
    time: row.time,
    details: row.details,
  }));
}
