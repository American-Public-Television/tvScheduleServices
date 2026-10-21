variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "widget_bucket_name" {
  description = "Name of the S3 bucket hosting the built widget"
  type        = string
  default     = "tvss-widget"
}

variable "create_github_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC provider, or reuse one that already exists in this AWS account"
  type        = bool
  default     = true
}

# The widget is built and deployed from apt_web (deploy-schedule-workflow.yml).
# Matches the live trust policy, which was edited by hand before 2026-10-21.
variable "github_deploy_subjects" {
  description = "GitHub OIDC subjects allowed to assume the widget deploy role"
  type        = list(string)
  default = [
    "repo:American-Public-Television/apt-web:pull_request",
    "repo:American-Public-Television/apt-web:ref:refs/heads/prod",
    "repo:American-Public-Television/apt_web:pull_request",
    "repo:American-Public-Television/apt_web:ref:refs/heads/prod",
    "repo:American-Public-Television@234624007/apt-web@1355210492:pull_request",
    "repo:American-Public-Television@234624007/apt-web@1355210492:ref:refs/heads/prod",
    "repo:American-Public-Television@234624007/apt_web@1355210492:pull_request",
    "repo:American-Public-Television@234624007/apt_web@1355210492:ref:refs/heads/prod",
  ]
}
