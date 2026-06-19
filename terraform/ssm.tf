resource "aws_ssm_parameter" "pbs_auth" {
  name  = "/tvss/PBS_AUTH"
  type  = "SecureString"
  value = var.pbs_auth_token
}

resource "aws_ssm_parameter" "tvss_config_prod" {
  name  = "/tvss/.env-production"
  type  = "SecureString"
  value = var.ssm_config
}
