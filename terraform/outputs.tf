output "api_gateway_url" {
  value = "https://${aws_api_gateway_rest_api.tvss.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.tvss.stage_name}"
}

output "lambda_function_name" {
  value = aws_lambda_function.tvss.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.tvss.arn
}
