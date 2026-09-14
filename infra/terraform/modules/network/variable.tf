variable "project_name" {
  description = "Ten he thong, dung lam prefix cho resource name"
  type        = string
}

variable "environment" {
  description = "Environment: dev | stg | prd"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block cho VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "So luong Availability Zone toi thieu 2 theo nguyen tac HA"
  type        = number
  default     = 2
}

variable "public_subnet_cidrs" {
  description = "CIDR cho Public Subnet (ALB), 1 phan tu / AZ"
  type        = list(string)
}

variable "app_subnet_cidrs" {
  description = "CIDR cho Private Subnet - app tier (ECS), 1 phan tu / AZ"
  type        = list(string)
}

variable "data_subnet_cidrs" {
  description = "CIDR cho Private Subnet - data tier (RDS), 1 phan tu / AZ"
  type        = list(string)
}

variable "nat_gateway_count" {
  description = "So luong NAT Gateway. prod: 1/AZ (bang az_count). dev: cho phep 1 dung chung de tiet kiem chi phi"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Tag chuan ap dung cho moi resource: Project, Environment, ManagedBy"
  type        = map(string)
  default     = {}
}

variable "data_subnet_internet_access_enabled" {
  description = <<-EOT
    CHI danh cho dev: khi true, them route 0.0.0.0/0 -> Internet Gateway vao
    route table cua Data Subnet de RDS co the bat publicly_accessible=true va
    ket noi duoc tu Internet (vd de seed data tu may ca nhan). KHONG bat o
    prod - vi pham nguyen tac "RDS khong duoc public" cua skill
    terraform-aws-generator, chi dung tam thoi va co y thuc cho dev.
  EOT
  type        = bool
  default     = false
}
