# The Lambda, tvss-api, its IAM role and the /tvss/* parameters moved to
# createtv_cms_devsite (terraform/tvss.tf) on 2026-10-21. These blocks drop
# them from this state without destroying them. This repo keeps only the
# widget hosting.

removed {
  from = aws_api_gateway_rest_api.tvss

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_resource.proxy

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_method.proxy_any

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_method.root_any

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_integration.proxy_lambda

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_integration.root_lambda

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_deployment.tvss

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_api_gateway_stage.tvss

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_lambda_function.tvss

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_lambda_permission.apigw_invoke

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_iam_role.lambda_exec

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_iam_role_policy.lambda_ssm

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_iam_role_policy_attachment.lambda_basic_logs

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_ssm_parameter.pbs_auth

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_ssm_parameter.tvss_config_prod

  lifecycle {
    destroy = false
  }
}
