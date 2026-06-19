variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "pbs_auth_token" {
  description = "PBS API auth token stored in SSM at /tvss/PBS_AUTH"
  type        = string
  sensitive   = true
}

variable "ssm_config" {
  description = "JSON config blob stored in SSM at /tvss/.env-production (pbs_endpoints, ALLOWED_ORIGINS)"
  type        = string
  sensitive   = true
}
