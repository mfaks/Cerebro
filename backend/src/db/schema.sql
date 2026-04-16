CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('PAYLOAD', 'DEBRIS', 'ROCKET_BODY')),
  status        TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNTRACKED')),
  geom          geometry(Point, 4326) NOT NULL,
  altitude      NUMERIC NOT NULL,
  speed         NUMERIC NOT NULL,
  inclination   NUMERIC NOT NULL,
  country       TEXT,
  launch_date   DATE,
  rcs_size      TEXT CHECK (rcs_size IN ('SMALL', 'MEDIUM', 'LARGE')),
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_geom_idx         ON assets USING GIST (geom);
CREATE INDEX IF NOT EXISTS assets_type_idx         ON assets (type);
CREATE INDEX IF NOT EXISTS assets_last_updated_idx ON assets (last_updated);

CREATE TABLE IF NOT EXISTS coverage_zones (
  id          TEXT PRIMARY KEY,
  asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  polygon     geometry(Polygon, 4326) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coverage_zones_geom_idx ON coverage_zones USING GIST (polygon);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('CONJUNCTION', 'OVERPASS')),
  asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  time        TIMESTAMPTZ NOT NULL,
  details     JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS events_asset_idx ON events (asset_id);
CREATE INDEX IF NOT EXISTS events_time_idx  ON events (time DESC);

CREATE TABLE IF NOT EXISTS positions (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  geom        geometry(Point, 4326) NOT NULL,
  altitude    NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS positions_asset_time_idx ON positions (asset_id, recorded_at DESC);

