terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "network" {
  source = "../../modules/network"

  project_name                         = var.project_name
  environment                          = var.environment
  vpc_cidr                             = var.vpc_cidr
  az_count                             = var.az_count
  public_subnet_cidrs                  = var.public_subnet_cidrs
  app_subnet_cidrs                     = var.app_subnet_cidrs
  data_subnet_cidrs                    = var.data_subnet_cidrs
  nat_gateway_count                    = var.nat_gateway_count
  data_subnet_internet_access_enabled  = var.rds_public_access_enabled
  tags                                 = local.common_tags
}

module "security" {
  source = "../../modules/security"

  project_name              = var.project_name
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  container_port             = var.container_port
  enable_public_rds_access   = var.rds_public_access_enabled
  allowed_ip_cidrs           = var.allowed_ip_cidrs
  test_listener_port         = var.test_listener_port
  allowed_test_cidrs         = var.allowed_test_cidrs
  tags                       = local.common_tags
}

module "storage" {
  source = "../../modules/storage"

  project_name = var.project_name
  environment   = var.environment
  tags          = local.common_tags
}

module "database" {
  source = "../../modules/database"

  project_name       = var.project_name
  environment          = var.environment
  data_subnet_ids      = module.network.data_subnet_ids
  rds_sg_id            = module.security.rds_sg_id
  engine_version       = var.db_engine_version
  db_instance_class    = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
  multi_az             = var.rds_multi_az
  publicly_accessible  = var.rds_public_access_enabled
  tags                 = local.common_tags
}

module "compute" {
  source = "../../modules/compute"

  project_name         = var.project_name
  environment           = var.environment
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  app_subnet_ids        = module.network.app_subnet_ids
  alb_sg_id             = module.security.alb_sg_id
  ecs_sg_id             = module.security.ecs_sg_id
  container_port        = var.container_port
  test_listener_port    = var.test_listener_port
  ecr_repository_url    = module.storage.ecr_repository_url
  image_tag             = var.image_tag
  ecs_task_cpu          = var.ecs_task_cpu
  ecs_task_memory       = var.ecs_task_memory
  desired_count         = var.ecs_desired_count
  cpu_alarm_threshold   = var.cpu_alarm_threshold
  database_url          = "mysql://${var.db_username}:${var.db_password}@${module.database.rds_address}:${module.database.rds_port}/${var.db_name}"
  run_db_seed           = var.run_db_seed
  database_ssl_enabled  = var.database_ssl_enabled
  cookie_secure_enabled = var.cookie_secure_enabled
  alert_email           = var.alert_email
  tags                  = local.common_tags
}

module "cicd" {
  source = "../../modules/cicd"

  project_name = var.project_name
  environment  = var.environment

  ecr_repository_arn = module.storage.ecr_repository_arn
  ecr_repository_url = module.storage.ecr_repository_url

  ecs_cluster_name        = module.compute.ecs_cluster_name
  ecs_service_name        = module.compute.ecs_service_name
  ecs_task_family         = module.compute.ecs_task_family
  container_name          = module.compute.container_name
  container_port          = module.compute.container_port
  alb_listener_prod_arn   = module.compute.alb_listener_prod_arn
  alb_listener_test_arn   = module.compute.alb_listener_test_arn
  target_group_blue_name  = module.compute.target_group_blue_name
  target_group_green_name = module.compute.target_group_green_name

  github_owner            = var.github_owner
  github_repo             = var.github_repo
  github_branch           = var.github_branch
  codestar_connection_arn = var.codestar_connection_arn

  alert_email = var.alert_email

  tags = local.common_tags
}
