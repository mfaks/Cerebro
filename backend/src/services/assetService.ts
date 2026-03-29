import { query } from '../db/client.js';
import type { Asset, AssetQuery, AssetTrack, TrackPoint } from '../types/types.js';

interface AssetRow {
  id: string;
  name: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  country: string;
  launch_date: string | null;
  rcs_size: string;
  last_updated: string;
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Asset['type'],
    status: row.status as Asset['status'],
    position: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      altitude: Number(row.altitude),
    },
    velocity: {
      speed: Number(row.speed),
      heading: Number(row.heading),
    },
    lastUpdated: row.last_updated,
    metadata: {
      country: row.country,
      launchDate: row.launch_date,
      rcsSize: row.rcs_size as Asset['metadata']['rcsSize'],
    },
  };
}

const BASE_SELECT = `
  SELECT
    id, name, type, status,
    ST_Y(geom) AS latitude,
    ST_X(geom) AS longitude,
    altitude, speed, heading,
    country, launch_date, rcs_size, last_updated
  FROM assets
`;

export async function getAllAssets(q: AssetQuery): Promise<Asset[]> {
  const params: unknown[] = [];
  let sql = BASE_SELECT + ' WHERE 1=1';

  if (q.type) {
    params.push(q.type);
    sql += ` AND type = $${params.length}`;
  }
  if (q.startTime) {
    params.push(q.startTime);
    sql += ` AND last_updated >= $${params.length}`;
  }
  if (q.endTime) {
    params.push(q.endTime);
    sql += ` AND last_updated <= $${params.length}`;
  }

  const result = await query<AssetRow>(sql, params);
  return result.rows.map(rowToAsset);
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const result = await query<AssetRow>(
    BASE_SELECT + ' WHERE id = $1',
    [id],
  );
  const row = result.rows[0];
  return row ? rowToAsset(row) : null;
}

export async function getAssetTrack(
  id: string,
  startTime?: string,
  endTime?: string,
): Promise<AssetTrack | null> {
  const exists = await getAssetById(id);
  if (!exists) return null;

  const params: unknown[] = [id];
  let sql = `
    SELECT ST_Y(geom) AS latitude, ST_X(geom) AS longitude, altitude, recorded_at AS time
    FROM positions
    WHERE asset_id = $1
  `;
  if (startTime) {
    params.push(startTime);
    sql += ` AND recorded_at >= $${params.length}`;
  }
  if (endTime) {
    params.push(endTime);
    sql += ` AND recorded_at <= $${params.length}`;
  }
  sql += ' ORDER BY recorded_at ASC';

  interface PositionRow {
    latitude: number;
    longitude: number;
    altitude: number;
    time: string;
  }

  const result = await query<PositionRow>(sql, params);
  const points: TrackPoint[] = result.rows.map((r) => ({
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    altitude: Number(r.altitude),
    time: r.time,
  }));

  return { assetId: id, points };
}

export async function insertPosition(
  assetId: string,
  latitude: number,
  longitude: number,
  altitude: number,
): Promise<void> {
  await query(
    `INSERT INTO positions (asset_id, geom, altitude)
     VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $4)`,
    [assetId, latitude, longitude, altitude],
  );
}

export async function upsertAsset(asset: Asset): Promise<void> {
  await query(
    `INSERT INTO assets
       (id, name, type, status, geom, altitude, speed, heading, country, launch_date, rcs_size, last_updated)
     VALUES
       ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
       name         = EXCLUDED.name,
       type         = EXCLUDED.type,
       status       = EXCLUDED.status,
       geom         = EXCLUDED.geom,
       altitude     = EXCLUDED.altitude,
       speed        = EXCLUDED.speed,
       heading      = EXCLUDED.heading,
       last_updated = EXCLUDED.last_updated`,
    [
      asset.id, asset.name, asset.type, asset.status,
      asset.position.latitude, asset.position.longitude, asset.position.altitude,
      asset.velocity.speed, asset.velocity.heading,
      asset.metadata.country, asset.metadata.launchDate, asset.metadata.rcsSize,
      asset.lastUpdated,
    ],
  );
  await insertPosition(
    asset.id,
    asset.position.latitude,
    asset.position.longitude,
    asset.position.altitude,
  );
}
