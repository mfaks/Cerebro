#!/bin/bash
# Runs once on first boot via EC2 user data
# Terraform's templatefile() substitutes all $${...} placeholders before this script runs
set -euo pipefail

dnf update -y
dnf install -y docker
systemctl enable --now docker
usermod -aG docker ec2-user

# docker-compose-plugin is not in AL2023 repos — install the binary directly
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

mkdir -p /opt/cerebro

# Production compose file — all service configs are embedded inline via the
# top-level configs section (Docker Compose spec: configs.content, v2.24+)
# so no git clone is required on the instance.
cat > /opt/cerebro/compose.prod.yaml << 'COMPOSE'
services:

  postgres:
    image: postgis/postgis:17-3.5-alpine
    platform: linux/amd64
    environment:
      POSTGRES_USER: "${postgres_user}"
      POSTGRES_PASSWORD: "${postgres_password}"
      POSTGRES_DB: "${postgres_db}"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    configs:
      - source: schema
        target: /docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${postgres_user} -d ${postgres_db}"]
      interval: 5s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  queue:
    image: rabbitmq:4.2.5-alpine
    platform: linux/amd64
    environment:
      RABBITMQ_DEFAULT_USER: "${rabbitmq_user}"
      RABBITMQ_DEFAULT_PASS: "${rabbitmq_password}"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s
    restart: unless-stopped

  backend:
    image: "${ecr_backend_url}:${image_tag}"
    platform: linux/amd64
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
      DATABASE_URL: "postgresql://${postgres_user}:${postgres_password}@postgres:5432/${postgres_db}"
      RABBITMQ_URL: "amqp://${rabbitmq_user}:${rabbitmq_password}@queue:5672"
      FRONTEND_URL: "${frontend_url}"
      SPACETRACK_USER: "${spacetrack_user}"
      SPACETRACK_PASSWORD: "${spacetrack_password}"
      INGEST_INTERVAL_MS: "${ingest_interval_ms}"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
    depends_on:
      postgres:
        condition: service_healthy
      queue:
        condition: service_healthy
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v3.4.0
    platform: linux/amd64
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  grafana:
    image: grafana/grafana:12.0.1
    platform: linux/amd64
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: "${grafana_password}"
    volumes:
      - grafana-data:/var/lib/grafana
    configs:
      - source: grafana_datasources
        target: /etc/grafana/provisioning/datasources/datasources.yml
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  postgres-data:
  grafana-data:

configs:
  schema:
    content: |
      CREATE EXTENSION IF NOT EXISTS postgis;

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

      CREATE INDEX IF NOT EXISTS assets_updated_at_idx ON assets (updated_at);

      CREATE TABLE IF NOT EXISTS coverage_zones (
        id          BIGSERIAL PRIMARY KEY,
        asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
        boundary    geometry(Polygon, 4326) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS events (
        id          BIGSERIAL PRIMARY KEY,
        type        TEXT NOT NULL CHECK (type IN ('CONJUNCTION', 'OVERPASS')),
        asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
        occurred_at TIMESTAMPTZ NOT NULL,
        details     JSONB NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS events_asset_idx       ON events (asset_id);
      CREATE INDEX IF NOT EXISTS events_occurred_at_idx ON events (occurred_at DESC);

      CREATE TABLE IF NOT EXISTS positions (
        id          BIGSERIAL PRIMARY KEY,
        asset_id    TEXT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
        location    geometry(Point, 4326) NOT NULL,
        altitude    NUMERIC NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS positions_asset_time_idx ON positions (asset_id, recorded_at DESC);

  prometheus_config:
    content: |
      global:
        scrape_interval: 15s

      scrape_configs:
        - job_name: cerebro-backend
          static_configs:
            - targets:
                - backend:3000
          metrics_path: /metrics

  grafana_datasources:
    content: |
      apiVersion: 1

      datasources:
        - name: Prometheus
          type: prometheus
          uid: prometheus
          access: proxy
          url: http://prometheus:9090
          isDefault: true
COMPOSE

# Pulls the backend image from ECR and starts the full Docker Compose stack
cat > /opt/cerebro/start.sh << 'START'
#!/bin/bash
set -euo pipefail
cd /opt/cerebro
aws ecr get-login-password --region ${aws_region} \
    | docker login --username AWS --password-stdin ${ecr_registry}
docker compose -f compose.prod.yaml pull backend
docker compose -f compose.prod.yaml up -d
echo "Stack started. Check status with: docker compose -f /opt/cerebro/compose.prod.yaml ps"
START

chmod +x /opt/cerebro/start.sh
chown -R ec2-user:ec2-user /opt/cerebro

bash /opt/cerebro/start.sh
