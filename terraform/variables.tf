variable "aws_region" {
  description = "AWS region (Free Tier friendly)"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Base name for all resources"
  type        = string
  default     = "hospital-mgmt"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    Environment = "dev"
    Owner       = "birari"
    FreeTier    = "true"
    ProjectName = "hospital-mgmt"
  }
}

variable "rds_db_name" {
  description = "Initial database name"
  type        = string
  default     = "hospital"
}

variable "rds_username" {
  description = "Master username for MySQL"
  type        = string
  default     = "admin"
}

variable "rds_password" {
  description = "Master password for MySQL (use Secrets Manager in prod)"
  type        = string
  sensitive   = true
  default     = "ChangeMe123!"
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = "Grafana123!"
}
