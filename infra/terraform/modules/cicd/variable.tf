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

variable "ecs_execution_role_arn" {
  description = "ARN IAM Role execution cua ECS Task (output tu module compute) - dung cho iam:PassRole khi CodePipeline RegisterTaskDefinition"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ARN IAM Role task cua ECS Task (output tu module compute) - dung cho iam:PassRole khi CodePipeline RegisterTaskDefinition"
  type        = string
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
  description = "So phut cho phep kiem tra qua test listener truoc khi CodeDeploy tu dong xu ly theo deployment_ready_action_on_timeout"
  type        = number
  default     = 5
}

variable "deployment_ready_action_on_timeout" {
  description = <<-EOT
    Hanh dong khi het deployment_ready_wait_minutes ma khong co thao tac "Reroute
    traffic" thu cong:
    - CONTINUE_DEPLOYMENT: tu dong shift traffic prod sang green, khong can bam
      tay. Hop cho dev vi muon switch nhanh, chap nhan bo qua buoc kiem tra
      thu cong qua test listener.
    - STOP_DEPLOYMENT: dung lai, giu nguyen "blue", huy "green" - bat buoc
      nguoi van hanh tu bam "Reroute traffic" de tiep tuc. Nen dung cho prod
      de co buoc kiem tra thu cong truoc khi len traffic that.
  EOT
  type        = string
  default     = "STOP_DEPLOYMENT"

  validation {
    condition     = contains(["CONTINUE_DEPLOYMENT", "STOP_DEPLOYMENT"], var.deployment_ready_action_on_timeout)
    error_message = "deployment_ready_action_on_timeout chi nhan CONTINUE_DEPLOYMENT hoac STOP_DEPLOYMENT."
  }
}

variable "blue_instance_termination_wait_minutes" {
  description = "So phut giu lai task set 'blue' cu sau khi deploy thanh cong, truoc khi CodeDeploy terminate hang"
  type        = number
  default     = 5
}
