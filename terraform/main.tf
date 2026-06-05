terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

backend "s3" {
    bucket = "hospital-mgmt-terraform-state"
    key    = "hospital-management/terraform.tfstate"
    region = "ap-south-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ==== VPC Module ====
module "vpc" {
  source = "./modules/vpc"
  cidr   = var.vpc_cidr
  tags   = var.common_tags
}

# ==== EKS Module (t3.medium — supports 17 pods per node, enough for app + monitoring) ====
module "eks" {
  source                = "./modules/eks"
  cluster_name          = var.project_name
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  node_instance_type    = "t3.medium"   # upgraded: t3.small=11 pods, t3.medium=17 pods
  node_desired_capacity = 1
  tags                  = var.common_tags
}

# ==== RDS Security Group ====
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS MySQL"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Allow MySQL traffic from VPC"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, { Name = "${var.project_name}-rds-sg" })
}

# ==== RDS MySQL (db.t2.micro) ====
module "rds" {
  source                     = "./modules/rds"
  db_name                    = var.rds_db_name
  master_username            = var.rds_username
  master_password             = var.rds_password
  subnet_ids                 = module.vpc.private_subnet_ids
  vpc_security_group_ids     = [aws_security_group.rds.id]
  tags                       = var.common_tags
}

# ==== Data source for EKS auth token ====
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# ==== Helm provider (connect to the EKS cluster) ====
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# ==== Prometheus + Grafana (kube-prometheus-stack bundles both) ====
resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "55.7.0"

  timeout = 600  # 10 min — large chart, needs more time

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }

  set {
    name  = "grafana.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "prometheus.prometheusSpec.resources.requests.memory"
    value = "256Mi"
  }

  set {
    name  = "prometheus.prometheusSpec.resources.limits.memory"
    value = "512Mi"
  }
}
