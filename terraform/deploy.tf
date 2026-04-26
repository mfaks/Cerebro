# ── Backend Image ─────────────────────────────────────────────────────────────
# Builds and pushes the backend image from your local machine to ECR.
# Runs on every apply when image_tag or the ECR URL changes.
# The EC2 instance depends_on this so it won't boot until the image is ready.

resource "null_resource" "push_backend_image" {
    triggers = {
        image_tag = var.image_tag
        ecr_url   = aws_ecr_repository.cerebro.repository_url
    }

    provisioner "local-exec" {
        command = <<-EOT
            aws ecr get-login-password --region ${var.aws_region} | \
                docker login --username AWS --password-stdin ${aws_ecr_repository.cerebro.repository_url}
            docker buildx build --platform linux/amd64 \
                -f ${path.module}/../backend/Dockerfile \
                -t ${aws_ecr_repository.cerebro.repository_url}:${var.image_tag} \
                --push \
                ${path.module}/../backend
        EOT
    }

    depends_on = [aws_ecr_repository.cerebro]
}

# ── Frontend Build + Upload ───────────────────────────────────────────────────
# Builds the React app with the Elastic IP baked in, syncs to S3, and invalidates the CloudFront cache so the new build is served immediately.

resource "null_resource" "deploy_frontend" {
    triggers = {
        cloudfront_id = aws_cloudfront_distribution.frontend.id
        bucket        = aws_s3_bucket.frontend.bucket
    }

    provisioner "local-exec" {
        command = <<-EOT
            cd ${path.module}/../frontend
            VITE_API_BASE_URL=https://${aws_cloudfront_distribution.frontend.domain_name} \
            VITE_WS_BASE_URL=wss://${aws_cloudfront_distribution.frontend.domain_name} \
            VITE_ARCGIS_API_KEY=${var.arcgis_api_key} \
            npm run build
            aws s3 sync dist/ s3://${aws_s3_bucket.frontend.bucket} --delete
            aws cloudfront create-invalidation \
                --distribution-id ${aws_cloudfront_distribution.frontend.id} \
                --paths "/*"
        EOT
    }

    depends_on = [aws_s3_bucket_policy.frontend]
}
