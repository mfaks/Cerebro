# ── Outputs ───────────────────────────────────────────────────────────────────

output "server_ip" {
    description = "Elastic IP of the application server"
    value       = aws_eip.main.public_ip
}

output "backend_url" {
    description = "Backend API base URL (proxied through CloudFront)"
    value       = "https://${aws_cloudfront_distribution.frontend.domain_name}/api"
}

output "cloudfront_url" {
    description = "Frontend URL (CloudFront)"
    value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
