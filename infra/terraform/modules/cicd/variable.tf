variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

# ---------------------------------------------------------------------------
# Input tu module storage (ECR)
# ---------------------------------------------------------------------------
variable "ecr_repository_arn" {
  description = "ARN ECR repository (output tu module storage) - dung de gioi han IAM policy CodeBuild chi push dung 1 repo"
  type        = string
}

variable "ecr_repository_url" {
  description = "URL ECR repository (output tu module storage)"
  type        = string
}

# ---------------------------------------------------------------------------
# Input tu module compute (ECS + ALB Blue/Green)
# ---------------------------------------------------------------------------
variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "ecs_task_family" {
  description = "Family cua ECS Task Definition - CodeBuild dung de describe-task-definition va dung lam nen cho taskdef.json"
  type        = string
}

variable "container_name" {
  type = string
}

variable "container_port" {
  type = number
}

variable "alb_listener_prod_arn" {
  type = string
}

variable "alb_listener_test_arn" {
  type = string
}

variable "target_group_blue_name" {
  type = string
}

variable "target_group_green_name" {
  type = string
}

# ---------------------------------------------------------------------------
# Source (GitHub qua CodeStar Connection)
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
  description = "Nhanh trigger pipeline"
  type        = string
  default     = "main"
}

variable "codestar_connection_arn" {
  description = "ARN CodeStar Connection (GitHub) da duoc confirm thu cong tren AWS Console (PENDING -> AVAILABLE) - bat buoc khai bao trong terraform.tfvars"
  type        = string
}

# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------
variable "alert_email" {
  description = "Email nhan thong bao pipeline Success/Failed qua SNS - bat buoc khai bao, khong co default"
  type        = string
}

# ---------------------------------------------------------------------------
# CodeBuild
# ---------------------------------------------------------------------------
variable "codebuild_compute_type" {
  type    = string
  default = "BUILD_GENERAL1_SMALL"
}

variable "codebuild_image" {
  description = "Docker image chay CodeBuild - can privileged_mode de build/push Docker image"
  type        = string
  default     = "aws/codebuild/amazonlinux2-x86_64-standard:5.0"
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "artifact_bucket_force_destroy" {
  description = "true = cho phep xoa S3 bucket artifact ke ca con object ben trong (chi bat cho dev de tien don dep)"
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# CodeDeploy (Blue/Green)
# ---------------------------------------------------------------------------
variable "codedeploy_deployment_config" {
  description = <<-EOT
    dev: mac dinh CodeDeployDefault.ECSAllAtOnce - shift 100% traffic ngay sau
    khi test listener pass, chap nhan duoc vi it traffic va can rollback nhanh.
    prod nen doi sang CodeDeployDefault.ECSLinear10PercentEvery1Minutes hoac
    ECSCanary10Percent5Minutes de giam rui ro.
  EOT
  type        = string
  default     = "CodeDeployDefault.ECSAllAtOnce"
}

variable "deployment_ready_wait_minutes" {
  description = "So phut cho phep kiem tra qua test listener truoc khi tiep tuc shift traffic prod (STOP_DEPLOYMENT neu qua han)"
  type        = number
  default     = 5
}

variable "blue_instance_termination_wait_minutes" {
  description = "So phut giu lai task set 'blue' cu sau khi deploy thanh cong, truoc khi CodeDeploy terminate hang"
  type        = number
  default     = 5
}
