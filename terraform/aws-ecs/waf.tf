#
# WAFv2 WebACL for Application Load Balancers
#
# This file creates a regional WAFv2 WebACL to protect ALBs from common attacks.
# Addresses CKV2_AWS_28: Public facing ALB are protected by WAF
#
# Includes:
# - AWS Managed Rules: Common Rule Set (OWASP Top 10)
# - AWS Managed Rules: Known Bad Inputs (Log4j, Spring4Shell)
# - AWS Managed Rules: SQL Injection
# - Custom Rate Limiting Rule
#

resource "aws_wafv2_web_acl" "alb" {
  name        = "${var.name}-alb-waf"
  description = "WAF for ALBs - protects against OWASP Top 10, Log4j, and other common attacks"
  scope       = "REGIONAL"

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
      metric_name                = "${var.name}-AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Rules - Known Bad Inputs
  # Protects against Log4j (CVE-2021-44228), Spring4Shell, and other known exploits
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
      metric_name                = "${var.name}-AWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - SQL Injection
  # Protects against SQL injection attacks
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Rate Limiting
  # Protects against DDoS and brute force attacks
  rule {
    name     = "RateLimitRule"
    priority = 4

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
      metric_name                = "${var.name}-RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-ALBWAFMetric"
    sampled_requests_enabled   = true
  }

  tags = merge(
    local.common_tags,
    {
      Name      = "${var.name}-alb-waf"
      Component = "security"
    }
  )
}

# Associate WAF with Keycloak ALB
resource "aws_wafv2_web_acl_association" "keycloak_alb" {
  resource_arn = aws_lb.keycloak.arn
  web_acl_arn  = aws_wafv2_web_acl.alb.arn
}

# Associate WAF with MCP Gateway ALB
resource "aws_wafv2_web_acl_association" "mcp_gateway_alb" {
  resource_arn = module.mcp_gateway.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.alb.arn
}

# CloudWatch Log Group for WAF logs (optional, for debugging)
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "aws-waf-logs-${var.name}-alb"
  retention_in_days = 30

  tags = merge(
    local.common_tags,
    {
      Name      = "aws-waf-logs-${var.name}-alb"
      Component = "security"
    }
  )
}

# WAF logging configuration
resource "aws_wafv2_web_acl_logging_configuration" "alb" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn            = aws_wafv2_web_acl.alb.arn

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
