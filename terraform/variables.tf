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

variable "widget_bucket_name" {
  description = "Name of the S3 bucket hosting the built widget"
  type        = string
  default     = "tvss-widget"
}

variable "github_repo" {
  description = "GitHub repo (owner/name) allowed to assume the widget deploy role via OIDC"
  type        = string
  default     = "American-Public-Television/tvScheduleServices"
}

variable "github_deploy_branch" {
  description = "Branch that triggers the widget deploy workflow"
  type        = string
  default     = "prod"
}

variable "create_github_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC provider, or reuse one that already exists in this AWS account"
  type        = bool
  default     = true
}
