CREATE EXTENSION IF NOT EXISTS postgis;

-- Every satellite, rocket body, and piece of debris tracked by the system.
-- The id is the NORAD catalog number (e.g. '25544' for the ISS) so the ingestion
-- pipeline can upsert by natural key without a separate lookup before every write.
CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('PAYLOAD', 'DEBRIS', 'ROCKET_BODY')),
  status        TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNTRACKED')),
  location      geometry(Point, 4326) NOT NULL,
  altitude      NUMERIC NOT NULL,
  speed         NUMERIC NOT NULL,
  inclination   NUMERIC NOT NULL,
  country       TEXT,
  launch_date   DATE,
  rcs_size      TEXT CHECK (rcs_size IN ('SMALL', 'MEDIUM', 'LARGE')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up the startTime / endTime range filters the asset list API supports.
CREATE INDEX IF NOT EXISTS assets_updated_at_idx ON assets (updated_at);

-- Ground footprint polygons showing what area each satellite can observe or reach.
-- Rows cascade-delete when the parent asset is removed.
CREATE TABLE IF NOT EXISTS coverage_zones (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  boundary    geometry(Polygon, 4326) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Things that happen to an asset: a close approach (CONJUNCTION) or a ground station pass (OVERPASS).
-- details holds whatever extra fields are relevant to that specific event type.
-- Rows cascade-delete when the parent asset is removed.
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('CONJUNCTION', 'OVERPASS')),
  asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}'
);

-- Event queries always filter by asset and sort newest-first; one index per column is enough.
CREATE INDEX IF NOT EXISTS events_asset_idx       ON events (asset_id);
CREATE INDEX IF NOT EXISTS events_occurred_at_idx ON events (occurred_at DESC);

-- One row per position refresh — builds the historical track the frontend replays.
-- Rows cascade-delete when the parent asset is removed.
CREATE TABLE IF NOT EXISTS positions (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  location    geometry(Point, 4326) NOT NULL,
  altitude    NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track queries filter by asset and sort by time, so a composite index beats two separate ones.
CREATE INDEX IF NOT EXISTS positions_asset_time_idx ON positions (asset_id, recorded_at DESC);
