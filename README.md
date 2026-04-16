# Cerebro

A geospatial platform for analyzing real-time satellite data.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An [ArcGIS Developer](https://developers.arcgis.com/) API key
- A free [Space-Track.org](https://www.space-track.org/auth/createAccount) account

## Quickstart

```bash
cp .env.example .env
# Fill in your credentials in .env (see Environment Variables below)

docker compose up
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173       |
| Backend    | http://localhost:3000       |
| Grafana    | http://localhost:3001       |
| Prometheus | http://localhost:9090       |
| RabbitMQ   | http://localhost:15672      |

## Environment Variables

See `.env.example` for the full list. Required values:

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `POSTGRES_USER`        | Postgres username                                |
| `POSTGRES_PASSWORD`    | Postgres password                                |
| `POSTGRES_DB`          | Postgres database name                           |
| `RABBITMQ_USER`        | RabbitMQ username                                |
| `RABBITMQ_PASSWORD`    | RabbitMQ password                                |
| `PORT`                 | Port the backend listens on (default `3000`)     |
| `FRONTEND_URL`         | Allowed CORS origin for the backend              |
| `VITE_ARCGIS_API_KEY`  | ArcGIS API key for the map                       |
| `VITE_API_BASE_URL`    | Backend base URL seen by the browser             |
| `VITE_WS_BASE_URL`     | Backend WebSocket base URL seen by the browser   |
| `SPACETRACK_USER`      | Space-Track.org login email                      |
| `SPACETRACK_PASSWORD`  | Space-Track.org password                         |
| `INGEST_INTERVAL_MS`   | How often to fetch TLEs in ms (default `3600000`)|
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password                         |
| `DATABASE_URL`         | Full Postgres connection string (local dev only) |
| `RABBITMQ_URL`         | Full RabbitMQ connection string (local dev only) |

## Local Development (without Docker)

```bash
# Terminal 1 — start infra
docker compose up postgres queue

# Terminal 2 — backend
cd backend
npm install
npm run dev

# Terminal 3 — frontend
cd frontend
npm install
npm run dev
```

## Architecture

```
frontend/   React 19 + Vite + ArcGIS + shadcn/ui
backend/    Node.js 22 + Express 5 + PostgreSQL/PostGIS + RabbitMQ
observability/  Prometheus + Grafana
```

The backend ingests TLE data from Space-Track.org on a configurable interval, propagates orbital positions using SGP4 (`satellite.js`), and pushes updates to connected clients over WebSocket.
