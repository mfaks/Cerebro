# Terraform native tests for the Cerebro EC2 architecture.
# Uses mock_provider so no real AWS credentials or deployed resources are needed.

mock_provider "aws" {
    mock_data "aws_availability_zones" {
        defaults = {
            names = ["us-east-1a", "us-east-1b", "us-east-1c"]
        }
    }

    mock_data "aws_caller_identity" {
        defaults = {
            account_id = "123456789012"
            arn        = "arn:aws:iam::123456789012:user/test"
            user_id    = "TESTUSER"
        }
    }

    mock_data "aws_ami" {
        defaults = {
            id = "ami-0123456789abcdef0"
        }
    }
}

# ── Shared variables ──────────────────────────────────────────────────────────
variables {
    ssh_key_name        = "cerebro-key"
    github_repo_url     = "https://github.com/test/cerebro"
    postgres_password   = "test-pg-password"
    rabbitmq_password   = "test-rmq-password"
    spacetrack_user     = "test@example.com"
    spacetrack_password = "test-st-password"
    arcgis_api_key      = "test-arcgis-key"
}

# ── Networking ────────────────────────────────────────────────────────────────
run "vpc_is_configured_correctly" {
    command = plan

    assert {
        condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
        error_message = "VPC must use 10.0.0.0/16 CIDR block"
    }

    assert {
        condition     = aws_vpc.main.enable_dns_support == true
        error_message = "VPC must have DNS support enabled"
    }

    assert {
        condition     = aws_vpc.main.enable_dns_hostnames == true
        error_message = "VPC must have DNS hostnames enabled so the instance can resolve AWS endpoints"
    }
}

run "single_public_subnet" {
    command = plan

    assert {
        condition     = aws_subnet.public.cidr_block == "10.0.1.0/24"
        error_message = "Public subnet must use 10.0.1.0/24"
    }

    assert {
        condition     = aws_subnet.public.map_public_ip_on_launch == true
        error_message = "Subnet must auto-assign public IPs so the instance can reach ECR and Docker Hub"
    }
}

# ── Security group ────────────────────────────────────────────────────────────
run "security_group_exposes_only_required_ports" {
    command = plan

    assert {
        condition = anytrue([
            for rule in aws_security_group.ec2.ingress :
            rule.from_port == 22 && rule.to_port == 22 && rule.protocol == "tcp"
        ])
        error_message = "Security group must allow SSH on port 22"
    }

    assert {
        condition = anytrue([
            for rule in aws_security_group.ec2.ingress :
            rule.from_port == 3000 && rule.to_port == 3000 && rule.protocol == "tcp"
        ])
        error_message = "Security group must allow backend API and WebSocket traffic on port 3000"
    }

    assert {
        condition = alltrue([
            for rule in aws_security_group.ec2.ingress :
            rule.from_port != 5432 && rule.from_port != 5672
        ])
        error_message = "Postgres (5432) and RabbitMQ (5672) must not be exposed publicly — they run inside Docker and are only reachable on the instance"
    }
}

# ── Compute ───────────────────────────────────────────────────────────────────
run "ec2_instance_is_configured_correctly" {
    command = plan

    assert {
        condition     = aws_instance.main.instance_type == "t3.small"
        error_message = "Instance type must be t3.small"
    }

    assert {
        condition     = aws_instance.main.iam_instance_profile == aws_iam_instance_profile.ec2.name
        error_message = "Instance must have an IAM instance profile so it can pull from ECR without stored credentials"
    }

    assert {
        condition     = aws_instance.main.root_block_device[0].volume_size == 20
        error_message = "Root volume must be 20 GB to hold Docker images and postgres data"
    }

    assert {
        condition     = aws_instance.main.root_block_device[0].volume_type == "gp3"
        error_message = "Root volume must use gp3"
    }

    assert {
        condition     = aws_instance.main.root_block_device[0].encrypted == true
        error_message = "Root volume must be encrypted"
    }
}

run "ec2_iam_role_has_ecr_readonly" {
    command = plan

    assert {
        condition     = aws_iam_role_policy_attachment.ecr_readonly.policy_arn == "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
        error_message = "EC2 role must have ECR read-only access to pull backend images"
    }
}

# ── ECR ───────────────────────────────────────────────────────────────────────
run "ecr_repository_is_configured_correctly" {
    command = plan

    assert {
        condition     = aws_ecr_repository.cerebro.force_delete == true
        error_message = "ECR repo must have force_delete so terraform destroy works without manual cleanup"
    }

    assert {
        condition     = aws_ecr_repository.cerebro.image_scanning_configuration[0].scan_on_push == true
        error_message = "ECR repo must scan images on push"
    }
}

# ── Frontend hosting ──────────────────────────────────────────────────────────
run "s3_bucket_blocks_all_public_access" {
    command = plan

    assert {
        condition     = aws_s3_bucket_public_access_block.frontend.block_public_acls == true
        error_message = "S3 bucket must block public ACLs"
    }

    assert {
        condition     = aws_s3_bucket_public_access_block.frontend.block_public_policy == true
        error_message = "S3 bucket must block public bucket policies"
    }

    assert {
        condition     = aws_s3_bucket_public_access_block.frontend.ignore_public_acls == true
        error_message = "S3 bucket must ignore public ACLs"
    }

    assert {
        condition     = aws_s3_bucket_public_access_block.frontend.restrict_public_buckets == true
        error_message = "S3 bucket must restrict public bucket access"
    }
}

run "cloudfront_serves_spa_correctly" {
    command = plan

    assert {
        condition     = aws_cloudfront_distribution.frontend.default_root_object == "index.html"
        error_message = "CloudFront must serve index.html at the root"
    }

    assert {
        condition = anytrue([
            for r in aws_cloudfront_distribution.frontend.custom_error_response :
            r.error_code == 403 && r.response_code == 200 && r.response_page_path == "/index.html"
        ])
        error_message = "CloudFront must rewrite 403 responses to index.html so React Router handles unknown paths"
    }

    assert {
        condition = anytrue([
            for r in aws_cloudfront_distribution.frontend.custom_error_response :
            r.error_code == 404 && r.response_code == 200 && r.response_page_path == "/index.html"
        ])
        error_message = "CloudFront must rewrite 404 responses to index.html so React Router handles unknown paths"
    }
}
