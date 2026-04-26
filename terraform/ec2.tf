# ── IAM Role for EC2 ──────────────────────────────────────────────────────────
# Grants the instance permission to pull images from ECR without storing
# AWS credentials on disk — the instance metadata service provides short-lived
# credentials automatically via the attached instance profile.

resource "aws_iam_role" "ec2" {
    name = "${var.project_name}-ec2-role"

    assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect    = "Allow"
            Principal = { Service = "ec2.amazonaws.com" }
            Action    = "sts:AssumeRole"
        }]
    })

    tags = { Name = "${var.project_name}-ec2-role" }
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
    role       = aws_iam_role.ec2.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "ssm" {
    role       = aws_iam_role.ec2.name
    policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
    name = "${var.project_name}-ec2-profile"
    role = aws_iam_role.ec2.name
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────
# Runs the full Docker Compose stack: backend, postgres, rabbitmq,
# prometheus, and grafana. The frontend is served from S3 + CloudFront.

resource "aws_instance" "main" {
    ami                    = data.aws_ami.al2023.id
    instance_type          = var.instance_type
    subnet_id              = aws_subnet.public.id
    vpc_security_group_ids = [aws_security_group.ec2.id]
    iam_instance_profile   = aws_iam_instance_profile.ec2.name

    # 20 GB is enough for Docker images + postgres data + grafana storage
    root_block_device {
        volume_size = 30
        volume_type = "gp3"
        encrypted   = true
    }

    user_data = templatefile("${path.module}/files/userdata.sh", {
        aws_region          = var.aws_region
        ecr_registry        = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
        ecr_backend_url     = aws_ecr_repository.cerebro.repository_url
        image_tag           = var.image_tag
        frontend_url        = "*"
        postgres_user       = var.postgres_user
        postgres_password   = var.postgres_password
        postgres_db         = var.postgres_db
        rabbitmq_user       = var.rabbitmq_user
        rabbitmq_password   = var.rabbitmq_password
        spacetrack_user     = var.spacetrack_user
        spacetrack_password = var.spacetrack_password
        ingest_interval_ms  = var.ingest_interval_ms
        grafana_password    = var.grafana_admin_password
    })

    tags = { Name = "${var.project_name}-server" }

    depends_on = [null_resource.push_backend_image]
}

# ── Elastic IP ────────────────────────────────────────────────────────────────
# Stable public IP that survives stop/start cycles. The frontend build bakes
# this address in as VITE_API_BASE_URL, so it must not change after deploy.

resource "aws_eip" "main" {
    instance = aws_instance.main.id
    domain   = "vpc"

    tags = { Name = "${var.project_name}-eip" }
}
