variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  description = "VPC ID (output tu module network)"
  type        = string
}

variable "container_port" {
  description = "Port container Next.js lang nghe (dung cho SG ECS)"
  type        = number
  default     = 3000
}

variable "db_port" {
  description = "Port MySQL cho SG RDS"
  type        = number
  default     = 3306
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "enable_public_rds_access" {
  description = <<-EOT
    CHI danh cho dev: khi true, mo them ingress port DB tren SG cua RDS cho
    danh sach allowed_ip_cidrs (vd IP ca nhan de seed data qua Internet).
    KHONG bat o prod - vi pham nguyen tac "SG RDS chi nhan tu SG ECS" cua
    skill terraform-aws-generator, chi dung tam thoi va co y thuc cho dev.
  EOT
  type        = bool
  default     = false
}

variable "allowed_ip_cidrs" {
  description = "Danh sach CIDR /32 duoc phep ket noi truc tiep RDS qua Internet khi enable_public_rds_access=true. KHONG dung 0.0.0.0/0."
  type        = list(string)
  default     = []

  validation {
    condition     = !contains(var.allowed_ip_cidrs, "0.0.0.0/0")
    error_message = "Khong duoc mo allowed_ip_cidrs = 0.0.0.0/0 cho RDS. Chi khai bao CIDR /32 cua IP that su can truy cap."
  }
}

variable "test_listener_port" {
  description = "Port cua ALB test listener dung cho CodeDeploy Blue/Green (ECS)."
  type        = number
  default     = 8080
}

variable "allowed_test_cidrs" {
  description = <<-EOT
    Danh sach CIDR duoc phep goi ALB test listener (Blue/Green CodeDeploy) -
    vd IP noi bo/QA de kiem tra revision green truoc khi shift traffic that.
    Rong = khong tao ingress rule nay (chua bat CI/CD Blue/Green).
    KHONG dung 0.0.0.0/0 - ALB SG chi duoc mo 0.0.0.0/0 tren port 80/443.
  EOT
  type        = list(string)
  default     = []

  validation {
    condition     = !contains(var.allowed_test_cidrs, "0.0.0.0/0")
    error_message = "Khong duoc mo allowed_test_cidrs = 0.0.0.0/0. ALB SG chi duoc mo 0.0.0.0/0 tren port 80/443."
  }
}
