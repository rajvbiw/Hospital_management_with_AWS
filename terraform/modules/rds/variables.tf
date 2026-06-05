variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "hospital"
}

variable "master_username" {
  description = "Master username for MySQL"
  type        = string
  default     = "admin"
}

variable "master_password" {
  description = "Master password for MySQL (use Secrets Manager in prod)"
  type        = string
  sensitive   = true
  default     = "ChangeMe123!"
}

variable "subnet_ids" {
  description = "List of subnet IDs for the RDS subnet group"
  type        = list(string)
}

variable "vpc_security_group_ids" {
  description = "Security group IDs to associate with the RDS instance"
  type        = list(string)
}

variable "tags" {
  description = "Common tags for all RDS resources"
  type        = map(string)
  default = {}
}
