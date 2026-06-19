data "archive_file" "tvss_zip" {
  type        = "zip"
  source_dir  = "./../lambda/tvScheduleServices"
  output_path = "./dist/tvScheduleServices.zip"
  excludes    = [".gitignore"]
}

resource "aws_lambda_function" "tvss" {
  filename         = "./dist/tvScheduleServices.zip"
  function_name    = "tvScheduleServices"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 30
  source_code_hash = data.archive_file.tvss_zip.output_base64sha256

  environment {
    variables = {
      SSM_STORE = "/tvss/.env-production"
    }
  }
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tvss.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tvss.execution_arn}/*/*"
}
