#
# WAFv2 WebACL for CloudFront Distributions
#
# This file creates a global WAFv2 WebACL (in us-east-1) to protect CloudFront distributions.
# Addresses CKV2_AWS_47: CloudFront attached WAFv2 WebACL configured for Log4j
#
# Note: CloudFront WAF must be created in us-east-1 region regardless of where
# other resources are deployed.
#
# The us-east-1 provider alias is defined in cloudfront-acm.tf
#

# WAFv2 WebACL for CloudFront (only created when CloudFront is enabled)
resource "aws_wafv2_web_acl" "cloudfront" {
  count = var.enable_cloudfront ? 1 : 0

  provider    = aws.us_east_1
  name        = "${var.name}-cloudfront-waf"
  description = "WAF for CloudFront - protects against OWASP Top 10, Log4j, and other common attacks"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 1: AWS Managed Rules - Common Rule Set
  # Protects against OWASP Top 10 including XSS, path traversal, etc.
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that may cause false positives for legitimate API traffic
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "SizeRestrictions_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-CloudFrontCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Rules - Known Bad Inputs
  # Protects against Log4j (CVE-2021-44228), Spring4Shell, and other known exploits
  # This rule is specifically required by CKV2_AWS_47
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-CloudFrontKnownBadInputsMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Rate Limiting
  # Protects against DDoS and brute force attacks at the edge
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-CloudFrontRateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-CloudFrontWAFMetric"
    sampled_requests_enabled   = true
  }

  tags = merge(
    local.common_tags,
    {
      Name      = "${var.name}-cloudfront-waf"
      Component = "security"
    }
  )
}

# CloudWatch Log Group for CloudFront WAF logs (in us-east-1)
resource "aws_cloudwatch_log_group" "cloudfront_waf_logs" {
  count = var.enable_cloudfront ? 1 : 0

  provider          = aws.us_east_1
  name              = "aws-waf-logs-${var.name}-cloudfront"
  retention_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name      = "aws-waf-logs-${var.name}-cloudfront"
      Component = "security"
    }
  )
}

# WAF logging configuration for CloudFront
resource "aws_wafv2_web_acl_logging_configuration" "cloudfront" {
  count = var.enable_cloudfront ? 1 : 0

  provider                = aws.us_east_1
  log_destination_configs = [aws_cloudwatch_log_group.cloudfront_waf_logs[0].arn]
  resource_arn            = aws_wafv2_web_acl.cloudfront[0].arn

  # Only log blocked requests to reduce log volume
  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior    = "KEEP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }
    }
  }
}
