#
# KMS Keys for Keycloak Resources
#
# This file creates Customer Managed Keys (CMKs) for encryption of:
# - SSM Parameters (Keycloak admin credentials)
# - CloudWatch Logs (Keycloak ECS logs)
#

#
# KMS Key for Keycloak SSM Parameters
#
resource "aws_kms_key" "keycloak_ssm" {
  description             = "KMS key for Keycloak SSM Parameters"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  # Key policy allowing account root and SSM service
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow SSM to use the key"
        Effect = "Allow"
        Principal = {
          Service = "ssm.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name      = "keycloak-ssm-key"
      Component = "keycloak"
      Purpose   = "ssm-parameters"
    }
  )
}

resource "aws_kms_alias" "keycloak_ssm" {
  name          = "alias/keycloak-ssm"
  target_key_id = aws_kms_key.keycloak_ssm.key_id
}

#
# KMS Key for Keycloak CloudWatch Logs
#
resource "aws_kms_key" "keycloak_logs" {
  description             = "KMS key for Keycloak CloudWatch Logs"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  # Key policy allowing account root and CloudWatch Logs service
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs to use the key"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:*"
          }
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name      = "keycloak-logs-key"
      Component = "keycloak"
      Purpose   = "cloudwatch-logs"
    }
  )
}

resource "aws_kms_alias" "keycloak_logs" {
  name          = "alias/keycloak-logs"
  target_key_id = aws_kms_key.keycloak_logs.key_id
}

#
# KMS Key for Keycloak ECR Repository
#
resource "aws_kms_key" "keycloak_ecr" {
  description             = "KMS key for Keycloak ECR repository"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  # Key policy allowing account root and ECR service
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ECR to use the key"
        Effect = "Allow"
        Principal = {
          Service = "ecr.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name      = "keycloak-ecr-key"
      Component = "keycloak"
      Purpose   = "ecr-repository"
    }
  )
}

resource "aws_kms_alias" "keycloak_ecr" {
  name          = "alias/keycloak-ecr"
  target_key_id = aws_kms_key.keycloak_ecr.key_id
}
