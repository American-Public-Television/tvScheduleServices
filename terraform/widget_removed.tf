# The widget hosting moved to aptonline_cms_devsite (terraform/widgets.tf) on
# 2026-11-23. These blocks drop it from this state without destroying it.
# Nothing in this repo manages AWS resources any more.

removed {
  from = aws_s3_bucket.widget

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_s3_bucket_public_access_block.widget

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_s3_bucket_policy.widget

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_cloudfront_origin_access_control.widget

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_cloudfront_distribution.widget

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_iam_role.github_actions_widget_deploy

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_iam_role_policy.github_actions_widget_deploy

  lifecycle {
    destroy = false
  }
}
