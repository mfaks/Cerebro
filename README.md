# Cerebro

A live satellite tracker. Pulls TLE data from Space-Track.org on a schedule, runs SGP4 orbit propagation to compute real-time positions, and streams live updates to the browser over WebSocket.

---

## Tech Stack

**Frontend**

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![ArcGIS](https://img.shields.io/badge/ArcGIS_Maps_SDK-2C7AC3?style=flat&logo=esri&logoColor=white)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17_+_PostGIS-4169E1?style=flat&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat&logo=rabbitmq&logoColor=white)

**Observability**

![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)

**Infrastructure**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazonwebservices&logoColor=white)

---

## Features

- Live satellite positions streamed over WebSocket as TLEs are ingested
- SGP4 orbit propagation via satellite.js — lat, lon, altitude computed from raw TLE data
- Interactive ArcGIS satellite basemap with hover tooltips (name, type, altitude, speed)
- Filter by object type (Payload, Debris, Rocket Body), orbital regime (LEO/MEO/GEO/HEO), and altitude range
- Scheduled TLE ingestion with a dead-letter queue for malformed messages
- Prometheus + Grafana observability out of the box
- Light / dark mode, persisted

---

## Architecture

```
Browser
  ├── HTTP  ──────────────► GET /api/v1/assets, /events, /coverage
  └── WebSocket ──────────► /ws/assets  (live position stream)
                                │
                         Express Backend
                                │
               ┌────────────────┼────────────────┐
               │                │                │
        PostgreSQL          RabbitMQ         /metrics
        (PostGIS)               │                │
    assets, positions,    ┌─────┴──────┐    Prometheus
    events, coverage      │            │         │
                       Producer    Consumer   Grafana
                          │            │
                    Space-Track    SGP4 propagation
                    TLE fetch      → upsert assets
```

| Service    | Port  | What it does                                            |
|------------|-------|---------------------------------------------------------|
| frontend   | 5173  | React SPA (S3 + CloudFront in production)               |
| backend    | 3000  | REST API, WebSocket server, TLE ingestion — one process |
| postgres   | 5432  | Stores assets, position history, events, coverage zones |
| rabbitmq   | 5672  | Decouples TLE fetching from DB writes                   |
| prometheus | 9090  | Scrapes backend Node.js metrics every 15s               |
| grafana    | 3001  | Connects to Prometheus; datasource auto-provisioned     |

---

## RabbitMQ Flow

The producer and consumer both live inside the backend process. TLE fetching is fully decoupled from DB writes — if the consumer is slow or a message is malformed, it never blocks the ingest cycle.

```
Space-Track.org
      │  (every INGEST_INTERVAL_MS, default 1 h)
      ▼
  Producer  →  Exchange: cerebro (topic, durable)
                    │  routing key: tle.ingest
                    ▼
            Queue: tle.ingest (durable)
                    │
              Consumer
              1. parse JSON → TLEPayload
              2. SGP4 init  (twoline2satrec)
              3. propagate  → ECI position/velocity
              4. eciToGeodetic → lat / lon / alt / speed
              5. upsertAsset  → PostgreSQL
              6. ack
                    │  on any error → nack (requeue=false)
                    ▼
            Queue: tle.ingest.dlq
              DLQ consumer logs and acks the message
```

A few deliberate choices worth calling out:
- **`requeue: false` on nack** — a malformed TLE would loop forever if requeued; routing it to the DLQ keeps the main queue healthy and preserves the bad message for inspection
- **`persistent: true` on publish** — messages survive a RabbitMQ restart mid-cycle
- **Topic exchange** — makes it easy to add new routing keys (e.g. `tle.historical`) later without touching the consumer binding

---

## AWS Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │  VPC  10.0.0.0/16                           │
  Browser                │  Public Subnet  10.0.1.0/24                 │
    │                    │                                             │
    ├─ HTTPS ──► CloudFront ──► S3  (React static build)              │
    │                    │                                             │
    └─ HTTP/WS ──────────┼──► Elastic IP ──► EC2 t3.small             │
                         │                     │  (Docker Compose)     │
                         │                     ├── backend    :3000    │
                         │                     ├── postgres   :5432    │
                         │                     ├── rabbitmq   :5672    │
                         │                     ├── prometheus :9090    │
                         │                     └── grafana    :3001    │
                         │                                             │
                         │  Security Group: inbound 22, 3000 only      │
                         └─────────────────────────────────────────────┘
                                       ▲
                              ECR  cerebro-backend
                         (backend image, last 3 tags kept)
```

| Resource        | Detail                                                                  |
|-----------------|-------------------------------------------------------------------------|
| EC2             | `t3.small`, Amazon Linux 2023, 20 GB gp3 EBS (encrypted)               |
| Elastic IP      | Stable public IP — baked into the frontend build as `VITE_API_BASE_URL` |
| ECR             | `cerebro-backend` repo; mutable tags; CVE scan on push                  |
| S3              | Private bucket; objects only reachable through CloudFront               |
| CloudFront      | HTTPS, edge caching, OAC signing; 403/404 → `index.html` for SPA routing|
| IAM             | EC2 instance profile with `ECRReadOnly` — no credentials on disk        |

---

## Running Locally

You'll need Docker, an [ArcGIS API key](https://developers.arcgis.com/), and a free [Space-Track.org](https://www.space-track.org/auth/createAccount) account.

```bash
cp .env.example .env   # fill in your credentials
docker compose up
```

| Service    | URL                    |
|------------|------------------------|
| Frontend   | http://localhost:5173  |
| Backend    | http://localhost:3000  |
| Grafana    | http://localhost:3001  |
| Prometheus | http://localhost:9090  |
| RabbitMQ   | http://localhost:15672 |

---

## Deploying to AWS

The full backend stack runs on a single EC2 t3.small via Docker Compose. The frontend is served from S3 + CloudFront. Budget roughly $25–35/month if you leave it running.

You'll need Terraform >= 1.9, AWS CLI >= 2, Docker, and an EC2 key pair (create one in the console first).

```bash
aws configure               # key, secret, region
aws sts get-caller-identity # verify credentials
```

### Step 1 — provision infrastructure

```bash
cd terraform
terraform init

terraform apply \
  -var="ssh_key_name=<your-key-pair-name>" \
  -var="github_repo_url=https://github.com/<you>/cerebro" \
  -var="postgres_password=$POSTGRES_PASSWORD" \
  -var="rabbitmq_password=$RABBITMQ_PASSWORD" \
  -var="spacetrack_user=$SPACETRACK_USER" \
  -var="spacetrack_password=$SPACETRACK_PASSWORD" \
  -var="arcgis_api_key=$VITE_ARCGIS_API_KEY" \
  -var="image_tag=latest"
```

This provisions the VPC, EC2, Elastic IP, ECR repo, S3 bucket, and CloudFront distribution (~2–3 min). The instance installs Docker and writes `compose.prod.yaml` on boot but won't start the stack yet — the ECR image doesn't exist yet.

### Step 2 — build and push the backend image

Built on Apple Silicon — `--platform linux/amd64` is required since the EC2 host is x86_64.

```bash
TAG=$(git rev-parse --short HEAD)

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <ecr_registry>

docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile \
  -t <ecr_backend_url>:$TAG \
  --push ./backend
```

### Step 3 — start the stack

```bash
ssh -i ~/.ssh/<key>.pem ec2-user@<elastic-ip> 'bash /opt/cerebro/start.sh'
```

### Step 4 — build and upload the frontend

```bash
cd frontend
VITE_API_BASE_URL=http://<elastic-ip>:3000 \
VITE_WS_BASE_URL=ws://<elastic-ip>:3000 \
VITE_ARCGIS_API_KEY=$VITE_ARCGIS_API_KEY \
  npm run build

aws s3 sync dist/ s3://<s3_bucket> --delete
```

### Step 5 — access

| Surface    | How                                                                               |
|------------|-----------------------------------------------------------------------------------|
| Frontend   | `cloudfront_url` from Terraform output                                            |
| Backend    | `http://<elastic-ip>:3000`                                                        |
| Grafana    | `ssh -L 3001:localhost:3001 ec2-user@<elastic-ip>` → http://localhost:3001        |
| Prometheus | `ssh -L 9090:localhost:9090 ec2-user@<elastic-ip>` → http://localhost:9090        |

### Deploying an update

```bash
TAG=$(git rev-parse --short HEAD)

docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile \
  -t <ecr_backend_url>:$TAG \
  --push ./backend

ssh -i ~/.ssh/<key>.pem ec2-user@<elastic-ip> 'bash /opt/cerebro/start.sh'
```

### Tearing down

```bash
aws s3 rm s3://<s3_bucket> --recursive
cd terraform && terraform destroy \
  -var="ssh_key_name=x" \
  -var="github_repo_url=x" \
  -var="postgres_password=x" \
  -var="rabbitmq_password=x" \
  -var="spacetrack_user=x" \
  -var="spacetrack_password=x" \
  -var="arcgis_api_key=x"
```

---

## Environment Variables

| Variable                 | Description                                           |
|--------------------------|-------------------------------------------------------|
| `POSTGRES_USER`          | PostgreSQL username                                   |
| `POSTGRES_PASSWORD`      | PostgreSQL password                                   |
| `POSTGRES_DB`            | PostgreSQL database name                              |
| `RABBITMQ_USER`          | RabbitMQ username                                     |
| `RABBITMQ_PASSWORD`      | RabbitMQ password                                     |
| `PORT`                   | Backend port (default `3000`)                         |
| `FRONTEND_URL`           | CORS origin the backend allows                        |
| `DATABASE_URL`           | Full PostgreSQL connection string                     |
| `RABBITMQ_URL`           | Full RabbitMQ connection string                       |
| `SPACETRACK_USER`        | Space-Track.org login email                           |
| `SPACETRACK_PASSWORD`    | Space-Track.org password                              |
| `INGEST_INTERVAL_MS`     | How often to fetch TLEs in ms (default `3600000`)     |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password                                |
| `VITE_ARCGIS_API_KEY`    | ArcGIS Maps SDK API key for the map                   |
| `VITE_API_BASE_URL`      | Backend HTTP URL the browser talks to                 |
| `VITE_WS_BASE_URL`       | WebSocket URL the browser connects to                 |
