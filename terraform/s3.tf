# ── S3 Bucket ─────────────────────────────────────────────────────────────────
# Stores the production build output of the React frontend (npm run build)

resource "aws_s3_bucket" "frontend" {
    bucket = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"

    force_destroy = true

    tags = { Name = "${var.project_name}-frontend" }
}

# Block all forms of public access so objects are only reachable through the CloudFront distribution
resource "aws_s3_bucket_public_access_block" "frontend" {
    bucket                  = aws_s3_bucket.frontend.id
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
}

# ── CloudFront ────────────────────────────────────────────────────────────────
# Serves the frontend globally over HTTPS with edge caching with OAC

resource "aws_cloudfront_origin_access_control" "frontend" {
    name                              = "${var.project_name}-frontend-oac"
    origin_access_control_origin_type = "s3"
    signing_behavior                  = "always"
    signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
    enabled             = true
    default_root_object = "index.html"

    # Skip waiting for the distribution to fully deploy (~15 min) on each apply because we don't use the domain in subsequent Terraform resources
    wait_for_deployment = false

    origin {
        domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
        origin_id                = "s3-frontend"
        origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    }

    # Backend origin — CloudFront proxies to EC2 over HTTP so the browser never
    # makes a plain HTTP request (fixes mixed content errors)
    origin {
        domain_name = "${aws_eip.main.public_ip}.nip.io"
        origin_id   = "backend"

        custom_origin_config {
            http_port              = 3000
            https_port             = 443
            origin_protocol_policy = "http-only"
            origin_ssl_protocols   = ["TLSv1.2"]
        }
    }

    # REST API with no caching, forward all headers and query strings
    ordered_cache_behavior {
        path_pattern           = "/api/*"
        allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
        cached_methods         = ["GET", "HEAD"]
        target_origin_id       = "backend"
        viewer_protocol_policy = "https-only"

        forwarded_values {
            query_string = true
            headers      = ["*"]
            cookies { forward = "all" }
        }

        min_ttl     = 0
        default_ttl = 0
        max_ttl     = 0
    }

    # WebSocket with no caching, forward all headers so the Upgrade handshake passes through
    ordered_cache_behavior {
        path_pattern           = "/ws/*"
        allowed_methods        = ["GET", "HEAD"]
        cached_methods         = ["GET", "HEAD"]
        target_origin_id       = "backend"
        viewer_protocol_policy = "https-only"

        forwarded_values {
            query_string = true
            headers      = ["*"]
            cookies { forward = "none" }
        }

        min_ttl     = 0
        default_ttl = 0
        max_ttl     = 0
    }

    default_cache_behavior {
        allowed_methods        = ["GET", "HEAD"]
        cached_methods         = ["GET", "HEAD"]
        target_origin_id       = "s3-frontend"
        viewer_protocol_policy = "redirect-to-https"

        forwarded_values {
            query_string = false
            cookies { forward = "none" }
        }

        min_ttl     = 0
        default_ttl = 3600
        max_ttl     = 86400
    }

    # SPA routing with React Router so S3 returns index.html with 200
    custom_error_response {
        error_code         = 403
        response_code      = 200
        response_page_path = "/index.html"
    }

    custom_error_response {
        error_code         = 404
        response_code      = 200
        response_page_path = "/index.html"
    }

    restrictions {
        geo_restriction { restriction_type = "none" }
    }

    # Uses the default *.cloudfront.net certificate to avoid needing a custom domain and ACM certificate
    viewer_certificate {
        cloudfront_default_certificate = true
    }

    tags = { Name = "${var.project_name}-frontend-cdn" }
}

# ── Bucket Policy ─────────────────────────────────────────────────────────────
# Grants CloudFront read access via the OAC signing mechanism
# The SourceArn condition locks access to this specific distribution so it's only accessible via CloudFront (and not directly from S3 or the internet)

data "aws_iam_policy_document" "frontend_s3" {
    statement {
        effect    = "Allow"
        actions   = ["s3:GetObject"]
        resources = ["${aws_s3_bucket.frontend.arn}/*"]

        principals {
            type        = "Service"
            identifiers = ["cloudfront.amazonaws.com"]
        }

        condition {
            test     = "StringEquals"
            variable = "AWS:SourceArn"
            values   = [aws_cloudfront_distribution.frontend.arn]
        }
    }
}

resource "aws_s3_bucket_policy" "frontend" {
    bucket = aws_s3_bucket.frontend.id
    policy = data.aws_iam_policy_document.frontend_s3.json
}
