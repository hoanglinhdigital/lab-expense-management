variable "project_name" {
  type    = string
  default = "expense-mgmt"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "region" {
  type    = string
  default = "ap-northeast-1"
}

# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/24", "10.0.1.0/24"]
}

variable "app_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "data_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "nat_gateway_count" {
  description = "Trade-off cho dev: 1 NAT Gateway dung chung 2 AZ de tiet kiem chi phi. prod phai = az_count."
  type        = number
  default     = 1
}

# ---------------------------------------------------------------------------
# Compute
# ---------------------------------------------------------------------------
variable "container_port" {
  type    = number
  default = 3000
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "ecs_task_cpu" {
  type    = number
  default = 256
}

variable "ecs_task_memory" {
  type    = number
  default = 512
}

variable "ecs_desired_count" {
  description = "Trade-off cho dev: 1 task (khong HA). prod bat buoc toi thieu 2."
  type        = number
  default     = 1
}

variable "cpu_alarm_threshold" {
  type    = number
  default = 80
}

variable "test_listener_port" {
  description = "Port ALB test listener (target group green) - dung boi CodeDeploy Blue/Green"
  type        = number
  default     = 8080
}

variable "allowed_test_cidrs" {
  description = "CIDR duoc phep goi ALB test listener (Blue/Green). Rong = chua bat SG rule nay. KHONG dung 0.0.0.0/0."
  type        = list(string)
  default     = []
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
variable "db_engine_version" {
  type    = string
  default = "8.0"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.small"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "expense_db"
}

variable "db_username" {
  description = "Username cho RDS MySQL - khong co default, khai bao trong terraform.tfvars (da gitignore)"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Password cho RDS MySQL - khong co default, khai bao trong terraform.tfvars (da gitignore)"
  type        = string
  sensitive   = true
}

variable "rds_multi_az" {
  description = "Trade-off cho dev: false (Single-AZ) de tiet kiem chi phi. prod bat buoc true."
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Truy cap RDS tu Internet - CHI danh cho dev, de seed data tu may ca nhan.
# Bat ca 3 co (network + security + database) cung luc. KHONG bat o prod.
# ---------------------------------------------------------------------------
variable "rds_public_access_enabled" {
  description = "true = mo RDS ra Internet (publicly_accessible + route IGW + SG ingress theo allowed_ip_cidrs). Chi dung tam thoi cho dev."
  type        = bool
  default     = false
}

variable "allowed_ip_cidrs" {
  description = "Danh sach CIDR /32 duoc phep ket noi RDS qua Internet khi rds_public_access_enabled=true. Bat buoc khai bao, khong co default, khong dung 0.0.0.0/0."
  type        = list(string)
  default     = []
}

# ---------------------------------------------------------------------------
# Auto-seed tren ECS
# ---------------------------------------------------------------------------
variable "run_db_seed" {
  description = "true = container tu chay prisma migrate deploy + prisma db seed (idempotent) khi khoi dong."
  type        = bool
  default     = true
}

variable "cookie_secure_enabled" {
  description = <<-EOT
    dev trade-off: dat false vi ALB dev chi co HTTP listener. Cookie Secure
    bi trinh duyet bo qua tren HTTP, khien login khong giu duoc session.
    prod PHAI true khi ALB co HTTPS.
  EOT
  type        = bool
  default     = false
}

variable "database_ssl_enabled" {
  description = <<-EOT
    dev trade-off: dat false de tat TLS giua ECS va RDS. Amazon RDS dung CA
    rieng khong nam trong CA store mac dinh cua Node.js, driver mariadb se
    treo (pool timeout) neu bat TLS ma khong cau hinh dung CA bundle. Traffic
    ECS<->RDS di trong VPC rieng nen chap nhan duoc o dev. prod phai true.
  EOT
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Alerting
# ---------------------------------------------------------------------------
variable "alert_email" {
  description = "Email nhan canh bao tu SNS Topic - bat buoc khai bao, khong co default"
  type        = string
}

# ---------------------------------------------------------------------------
# CI/CD (CodePipeline + CodeBuild + CodeDeploy Blue/Green)
# ---------------------------------------------------------------------------
variable "github_owner" {
  description = "GitHub org/user chua repo source - bat buoc khai bao trong terraform.tfvars"
  type        = string
}

variable "github_repo" {
  description = "Ten GitHub repo source - bat buoc khai bao trong terraform.tfvars"
  type        = string
}

variable "github_branch" {
  type    = string
  default = "main"
}

variable "codestar_connection_arn" {
  description = "ARN CodeStar Connection (GitHub) da duoc confirm (AVAILABLE) tren AWS Console - bat buoc khai bao trong terraform.tfvars"
  type        = string
}
