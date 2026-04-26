terraform {
    required_version = ">= 1.9"

    required_providers {
        aws = {
            source  = "hashicorp/aws"
            version = "~> 5.0"
        }
    }
}

provider "aws" {
    region = var.aws_region
}

# ── Data Sources ──────────────────────────────────────────────────────────────
data "aws_availability_zones" "available" {
    state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_ami" "al2023" {
    most_recent = true
    owners      = ["amazon"]

    filter {
        name   = "name"
        values = ["al2023-ami-*-x86_64"]
    }

    filter {
        name   = "virtualization-type"
        values = ["hvm"]
    }
}
