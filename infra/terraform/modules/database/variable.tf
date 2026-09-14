variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "data_subnet_ids" {
  description = "Danh sach Private Subnet ID - data tier (output tu module network)"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "Security Group ID cho RDS (output tu module security)"
  type        = string
}

variable "engine_version" {
  type    = string
  default = "8.0"
}

variable "db_instance_class" {
  type = string
}

variable "allocated_storage" {
  description = "Dung luong storage (GB)"
  type        = number
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "multi_az" {
  description = "prod bat buoc true. dev cho phep false de tiet kiem chi phi (xem comment tai resource)"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  type    = number
  default = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "publicly_accessible" {
  description = <<-EOT
    CHI danh cho dev: true de RDS nhan public IP va ket noi duoc qua Internet
    (can data_subnet_internet_access_enabled=true o module network va
    enable_public_rds_access=true o module security de thuc su truy cap duoc).
    KHONG bat o prod.
  EOT
  type        = bool
  default     = false
}
