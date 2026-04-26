# ── ECR Repositories ──────────────────────────────────────────────────────────
# Only the backend gets an ECR repo since it uses a custom Dockerfile
resource "aws_ecr_repository" "cerebro" {
    name = "${var.project_name}-backend"

    # MUTABLE allows re-pushing the :latest tag without creating a new tag
    image_tag_mutability = "MUTABLE"

    force_delete = true

    image_scanning_configuration {
        scan_on_push = true
    }

    tags = { Name = "${var.project_name}-backend" }
}

# ── Lifecycle Policy ──────────────────────────────────────────────────────────
# Keep only the 3 most recent images to allow one rollback if a bad deploy goes out
resource "aws_ecr_lifecycle_policy" "cerebro" {
    repository = aws_ecr_repository.cerebro.name

    policy = jsonencode({
        rules = [{
            rulePriority = 1
            description  = "Retain the 3 most recent images, expire the rest"
            selection = {
                tagStatus   = "any"
                countType   = "imageCountMoreThan"
                countNumber = 3
            }
            action = { type = "expire" }
        }]
    })
}
