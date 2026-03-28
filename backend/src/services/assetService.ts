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

export async function getAssetTrack(id: string): Promise<AssetTrack | null> {
  const asset = await getAssetById(id);
  if (!asset) return null;

  // Stub: single-point track from current position.
  const point: TrackPoint = {
    latitude: asset.position.latitude,
    longitude: asset.position.longitude,
    altitude: asset.position.altitude,
    time: asset.lastUpdated,
  };

  return { assetId: id, points: [point] };
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
}
