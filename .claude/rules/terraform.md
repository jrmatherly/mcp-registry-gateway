---
description: Terraform infrastructure patterns
globs:
  - "**/*.tf"
  - "**/*.tfvars"
  - "**/terraform/**/*"
---

# Terraform Patterns

## File Organization
```
terraform/
├── main.tf           # Provider and backend config
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── locals.tf         # Local values
├── ecs.tf            # ECS resources
├── documentdb.tf     # DocumentDB cluster
├── opensearch.tf     # OpenSearch domain
├── cognito.tf        # Cognito user pool
└── modules/          # Reusable modules
```

## Resource Naming
- Use consistent naming: `${var.project}-${var.environment}-${resource}`
- Use locals for computed names
- Tag all resources with project metadata

```hcl
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
  tags = local.common_tags
}
```

## Variables
- Always provide descriptions
- Use validation blocks for constraints
- Provide sensible defaults where appropriate

```hcl
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

## State Management
- Use S3 backend with DynamoDB locking
- Never commit state files
- Use workspaces for environment separation

## Security
- Use AWS Secrets Manager for sensitive values
- Never hardcode credentials
- Use IAM roles instead of access keys
