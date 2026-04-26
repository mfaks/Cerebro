# ── Input Variables ───────────────────────────────────────────────────────────
# Passed at apply time via -var flags or a terraform.tfvars file.
# Marks variables as sensitive so Terraform redacts them in plan/apply output.

variable "aws_region" {
    type        = string
    description = "AWS region to deploy into"
    default     = "us-east-1"
}

variable "project_name" {
    type        = string
    description = "Project name"
    default     = "cerebro"
}

variable "instance_type" {
    type        = string
    description = "EC2 instance type for the application server"
    default     = "t3.small"
}

variable "image_tag" {
    type        = string
    description = "Docker image tag to pull for the backend service"
    default     = "latest"
}

# ── Postgres ──────────────────────────────────────────────────────────────────
variable "postgres_user" {
    type        = string
    description = "PostgreSQL username"
    default     = "cerebro"
}

variable "postgres_password" {
    type        = string
    description = "PostgreSQL password"
    sensitive   = true
}

variable "postgres_db" {
    type        = string
    description = "PostgreSQL database name"
    default     = "cerebro"
}

# ── RabbitMQ ──────────────────────────────────────────────────────────────────
variable "rabbitmq_user" {
    type        = string
    description = "RabbitMQ username"
    default     = "cerebro"
}

variable "rabbitmq_password" {
    type        = string
    description = "RabbitMQ password"
    sensitive   = true
}

# ── Space-Track ───────────────────────────────────────────────────────────────
variable "spacetrack_user" {
    type        = string
    description = "Space-Track.org login email for TLE ingestion"
    sensitive   = true
}

variable "spacetrack_password" {
    type        = string
    description = "Space-Track.org login password for TLE ingestion"
    sensitive   = true
}

# ── ArcGIS ────────────────────────────────────────────────────────────────────
variable "arcgis_api_key" {
    type        = string
    description = "ArcGIS Maps SDK API key — embedded in the frontend build at npm run build time"
    sensitive   = true
}

# ── Observability ─────────────────────────────────────────────────────────────
variable "grafana_admin_password" {
    type        = string
    description = "Grafana admin password"
    sensitive   = true
    default     = "admin"
}

variable "ingest_interval_ms" {
    type        = string
    description = "How often the backend polls Space-Track for new TLEs (milliseconds)"
    default     = "3600000"
}