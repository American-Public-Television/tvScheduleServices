resource "aws_api_gateway_rest_api" "tvss" {
  name        = "tvss-api"
  description = "TV Schedule Services API"

  endpoint_configuration {
    types = ["EDGE"]
  }
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.tvss.id
  parent_id   = aws_api_gateway_rest_api.tvss.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.tvss.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "root_any" {
  rest_api_id   = aws_api_gateway_rest_api.tvss.id
  resource_id   = aws_api_gateway_rest_api.tvss.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "proxy_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.tvss.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.tvss.invoke_arn
}

resource "aws_api_gateway_integration" "root_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.tvss.id
  resource_id             = aws_api_gateway_rest_api.tvss.root_resource_id
  http_method             = aws_api_gateway_method.root_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.tvss.invoke_arn
}

resource "aws_api_gateway_deployment" "tvss" {
  rest_api_id = aws_api_gateway_rest_api.tvss.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy_any.id,
      aws_api_gateway_integration.proxy_lambda.id,
      aws_api_gateway_method.root_any.id,
      aws_api_gateway_integration.root_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "tvss" {
  deployment_id = aws_api_gateway_deployment.tvss.id
  rest_api_id   = aws_api_gateway_rest_api.tvss.id
  stage_name    = "prod"
}
