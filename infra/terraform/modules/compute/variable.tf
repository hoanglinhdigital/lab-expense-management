variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "Subnet cho ALB (output tu module network)"
  type        = list(string)
}

variable "app_subnet_ids" {
  description = "Subnet cho ECS Service (output tu module network)"
  type        = list(string)
}

variable "alb_sg_id" {
  type = string
}

variable "ecs_sg_id" {
  type = string
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "test_listener_port" {
  description = "Port cua ALB test listener (target group green) - dung boi CodeDeploy Blue/Green. SG cho port nay chi mo cho CIDR noi bo (xem module security)."
  type        = number
  default     = 8080
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  description = "Tag cua image trong ECR duoc deploy"
  type        = string
  default     = "latest"
}

variable "ecs_task_cpu" {
  type    = number
  default = 256
}

variable "ecs_task_memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  description = "prod toi thieu 2. dev cho phep 1 de tiet kiem chi phi (trade-off, xem comment tai resource)"
  type        = number
  default     = 1
}

variable "database_url" {
  description = "Connection string Next.js dung de ket noi RDS - sensitive, khong hardcode password"
  type        = string
  sensitive   = true
}

variable "database_ssl_enabled" {
  description = <<-EOT
    Truyen vao container qua bien moi truong DATABASE_SSL. App (resolveDatabaseUrl)
    mac dinh tu bat TLS khi host RDS khong phai "localhost".

    Amazon RDS dung CA rieng (Amazon RDS CA, xem
    https://truststore.pki.rds.amazonaws.com) - KHONG nam trong CA store mac
    dinh cua Node.js, nen driver `mariadb` (dung boi @prisma/adapter-mariadb)
    se bat tay TLS that bai va treo den khi pool timeout (loi "pool timeout:
    failed to retrieve a connection from pool").

    dev: dat false de tat TLS - chap nhan duoc vi traffic ECS<->RDS di trong
    VPC rieng (private subnet), khong ra Internet.
    prod: nen dat true VA cau hinh RDS CA bundle cho app (vd RDS_CA_BUNDLE_PATH)
    truoc khi bat lai, khong tat TLS neu traffic co the ra ngoai VPC.
  EOT
  type        = bool
  default     = true
}

variable "cookie_secure_enabled" {
  description = <<-EOT
    Truyen vao container qua bien moi truong COOKIE_SECURE. App set cookie
    session voi thuoc tinh Secure - trinh duyet se BO QUA cookie Secure tren
    ket noi HTTP thuan, khien login "thanh cong" (200) nhung khong giu duoc
    session (redirect ve lai /login).

    dev: dat false vi ALB dev hien chi co HTTP listener (chua co HTTPS/ACM cert).
    prod: PHAI true khi ALB co HTTPS listener - khong tat Secure neu cookie
    di qua mang cong khai.
  EOT
  type        = bool
  default     = true
}

variable "run_db_seed" {
  description = <<-EOT
    Truyen vao container qua bien moi truong RUN_DB_SEED. Khi true, entrypoint
    cua image se chay `prisma migrate deploy` + `prisma db seed` (idempotent)
    truoc khi start Next.js - dung de tu dong seed du lieu mau tren ECS.
    Nen dat false khi desired_count > 1 (nhieu task chay dong thoi) de tranh
    nhieu task cung chay migrate deploy mot luc.
  EOT
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email nhan canh bao tu SNS Topic - khong co default, bat buoc khai bao trong tfvars"
  type        = string
}

variable "cpu_alarm_threshold" {
  type    = number
  default = 80
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "tags" {
  type    = map(string)
  default = {}
}
