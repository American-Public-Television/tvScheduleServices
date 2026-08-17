output "api_gateway_url" {
  value = "https://${aws_api_gateway_rest_api.tvss.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.tvss.stage_name}"
}

output "lambda_function_name" {
  value = aws_lambda_function.tvss.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.tvss.arn
}

output "widget_bucket_name" {
  value = aws_s3_bucket.widget.bucket
}

output "widget_cloudfront_domain_name" {
  value = aws_cloudfront_distribution.widget.domain_name
}

output "widget_cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.widget.id
}

output "github_actions_widget_deploy_role_arn" {
  value = aws_iam_role.github_actions_widget_deploy.arn
}
