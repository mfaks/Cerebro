CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('PAYLOAD', 'DEBRIS', 'ROCKET_BODY')),
  status        TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNTRACKED')),
  geom          geometry(Point, 4326) NOT NULL,
  altitude      NUMERIC NOT NULL,
  speed         NUMERIC NOT NULL,
  heading       NUMERIC NOT NULL,
  country       TEXT NOT NULL,
  launch_date   DATE,
  rcs_size      TEXT NOT NULL CHECK (rcs_size IN ('SMALL', 'MEDIUM', 'LARGE')),
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_geom_idx ON assets USING GIST (geom);
CREATE INDEX IF NOT EXISTS assets_type_idx ON assets (type);

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

-- Seed mock assets data.
INSERT INTO assets (id, name, type, status, geom, altitude, speed, heading, country, launch_date, rcs_size, last_updated)
VALUES
  ('25544',  'ISS (ZARYA)',            'PAYLOAD',      'ACTIVE',    ST_SetSRID(ST_MakePoint(-120.3, 51.6),  4326), 408.5, 7.66, 51.6,  'US', '1998-11-20', 'LARGE',  '2026-03-25T12:00:00Z'),
  ('20580',  'HUBBLE SPACE TELESCOPE', 'PAYLOAD',      'ACTIVE',    ST_SetSRID(ST_MakePoint(45.2,   28.5),  4326), 540.0, 7.59, 28.5,  'US', '1990-04-24', 'LARGE',  '2026-03-25T12:00:00Z'),
  ('43013',  'STARLINK-1',             'PAYLOAD',      'ACTIVE',    ST_SetSRID(ST_MakePoint(22.1,   53.0),  4326), 550.0, 7.61, 53.0,  'US', '2019-05-24', 'MEDIUM', '2026-03-25T12:00:00Z'),
  ('99001',  'DEBRIS-OBJECT-A',        'DEBRIS',       'UNTRACKED', ST_SetSRID(ST_MakePoint(170.5, -30.2),  4326), 620.0, 7.55, 120.0, 'TBD', NULL,        'SMALL',  '2026-03-25T12:00:00Z')
ON CONFLICT (id) DO NOTHING;
