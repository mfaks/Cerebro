# ── VPC ───────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
    cidr_block           = "10.0.0.0/16"
    enable_dns_support   = true
    enable_dns_hostnames = true

    tags = { Name = "${var.project_name}-vpc" }
}

# ── Public Subnet ─────────────────────────────────────────────────────────────
# Single subnet is enough for one EC2 instance. The instance gets a public IP so it can reach ECR and Docker Hub without a NAT gateway

resource "aws_subnet" "public" {
    vpc_id                  = aws_vpc.main.id
    cidr_block              = "10.0.1.0/24"
    availability_zone       = data.aws_availability_zones.available.names[0]
    map_public_ip_on_launch = true

    tags = { Name = "${var.project_name}-public-subnet" }
}

# ── Internet Gateway + Routing ────────────────────────────────────────────────
resource "aws_internet_gateway" "main" {
    vpc_id = aws_vpc.main.id
    tags   = { Name = "${var.project_name}-igw" }
}

resource "aws_route_table" "public" {
    vpc_id = aws_vpc.main.id

    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.main.id
    }

    tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public" {
    subnet_id      = aws_subnet.public.id
    route_table_id = aws_route_table.public.id
}

# ── EC2 Security Group ────────────────────────────────────────────────────────
# Port 22: SSH access for deployments and debugging
# Port 3000: Backend API uses WebSocket so the frontend can connect to it

resource "aws_security_group" "ec2" {
    name        = "${var.project_name}-ec2-sg"
    description = "Backend API and WebSocket traffic"
    vpc_id      = aws_vpc.main.id

    ingress {
        description = "Backend API and WebSocket"
        from_port   = 3000
        to_port     = 3000
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = { Name = "${var.project_name}-ec2-sg" }
}
