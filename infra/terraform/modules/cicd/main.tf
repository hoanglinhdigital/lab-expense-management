data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# S3 Bucket - luu artifact CodePipeline (versioning + encryption bat san)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project_name}-${var.environment}-s3-cicd-artifacts-01"
  force_destroy = var.artifact_bucket_force_destroy

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-s3-cicd-artifacts-01"
  })
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# CloudWatch Log Group - CodeBuild
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "codebuild" {
  name              = "/codebuild/${var.project_name}-${var.environment}-build-01"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-log-group-codebuild-01"
  })
}

# ---------------------------------------------------------------------------
# IAM Role - CodeBuild (least-privilege, chi push duoc dung 1 ECR repository)
# ---------------------------------------------------------------------------
resource "aws_iam_role" "codebuild" {
  name = "${var.project_name}-${var.environment}-role-codebuild-01"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-role-codebuild-01"
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${var.project_name}-${var.environment}-policy-codebuild-01"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        # ecr:GetAuthorizationToken khong ho tro resource-level permission -
        # bat buoc Resource = "*" theo tai lieu IAM cua ECR.
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPushOneRepository"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = var.ecr_repository_arn
      },
      {
        Sid    = "ECSDescribeTaskDefinition"
        Effect = "Allow"
        # ecs:DescribeTaskDefinition khong ho tro resource-level permission -
        # CodeBuild dung action nay de lay taskdef hien tai lam nen cho taskdef.json.
        Action   = ["ecs:DescribeTaskDefinition"]
        Resource = "*"
      },
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.codebuild.arn}:*"
      },
      {
        Sid      = "ArtifactBucket"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:GetBucketLocation"]
        Resource = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# CodeBuild Project - build Docker image tu buildspec.yml, push len ECR
# ---------------------------------------------------------------------------
resource "aws_codebuild_project" "app" {
  name          = "${var.project_name}-${var.environment}-codebuild-app-01"
  service_role  = aws_iam_role.codebuild.arn
  build_timeout = 30

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    type         = "LINUX_CONTAINER"
    compute_type = var.codebuild_compute_type
    image        = var.codebuild_image
    # Bat buoc de docker build/push chay duoc ben trong CodeBuild.
    privileged_mode = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = data.aws_region.current.name
    }
    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
      name  = "ECR_REPOSITORY_URL"
      value = var.ecr_repository_url
    }
    environment_variable {
      name  = "CONTAINER_NAME"
      value = var.container_name
    }
    environment_variable {
      name  = "CONTAINER_PORT"
      value = tostring(var.container_port)
    }
    environment_variable {
      name  = "ECS_TASK_FAMILY"
      value = var.ecs_task_family
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.codebuild.name
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-codebuild-app-01"
  })
}

# ---------------------------------------------------------------------------
# IAM Role - CodeDeploy (Blue/Green ECS), dung managed policy chuan cua AWS
# ---------------------------------------------------------------------------
resource "aws_iam_role" "codedeploy" {
  name = "${var.project_name}-${var.environment}-role-codedeploy-01"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-role-codedeploy-01"
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

# ---------------------------------------------------------------------------
# CodeDeploy Application + Deployment Group - Blue/Green len ECS Service
# ---------------------------------------------------------------------------
resource "aws_codedeploy_app" "app" {
  name             = "${var.project_name}-${var.environment}-codedeploy-app-01"
  compute_platform = "ECS"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-codedeploy-app-01"
  })
}

resource "aws_codedeploy_deployment_group" "app" {
  app_name               = aws_codedeploy_app.app.name
  deployment_group_name  = "${var.project_name}-${var.environment}-codedeploy-dg-01"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = var.codedeploy_deployment_config

  deployment_style {
    deployment_type   = "BLUE_GREEN"
    deployment_option = "WITH_TRAFFIC_CONTROL"
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout    = "STOP_DEPLOYMENT"
      wait_time_in_minutes = var.deployment_ready_wait_minutes
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = var.blue_instance_termination_wait_minutes
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = var.ecs_service_name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.alb_listener_prod_arn]
      }

      test_traffic_route {
        listener_arns = [var.alb_listener_test_arn]
      }

      target_group {
        name = var.target_group_blue_name
      }

      target_group {
        name = var.target_group_green_name
      }
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-codedeploy-dg-01"
  })
}

# ---------------------------------------------------------------------------
# IAM Role - CodePipeline
# ---------------------------------------------------------------------------
resource "aws_iam_role" "codepipeline" {
  name = "${var.project_name}-${var.environment}-role-codepipeline-01"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-role-codepipeline-01"
  })
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${var.project_name}-${var.environment}-policy-codepipeline-01"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ArtifactBucket"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:GetBucketVersioning"]
        Resource = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
      },
      {
        Sid      = "CodeStarConnection"
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection"]
        Resource = var.codestar_connection_arn
      },
      {
        Sid      = "CodeBuild"
        Effect   = "Allow"
        Action   = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"]
        Resource = aws_codebuild_project.app.arn
      },
      {
        Sid    = "CodeDeploy"
        Effect = "Allow"
        Action = [
          "codedeploy:CreateDeployment",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:GetApplicationRevision",
          "codedeploy:RegisterApplicationRevision"
        ]
        Resource = [
          aws_codedeploy_app.app.arn,
          aws_codedeploy_deployment_group.app.arn,
          "arn:aws:codedeploy:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:deploymentconfig:*"
        ]
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# CodePipeline - 3 stage: Source (CodeStar Connection) -> Build -> Deploy
# ---------------------------------------------------------------------------
resource "aws_codepipeline" "app" {
  name     = "${var.project_name}-${var.environment}-codepipeline-app-01"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = var.github_branch
        DetectChanges    = "true"
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.app.name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeployToECS"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ApplicationName                = aws_codedeploy_app.app.name
        DeploymentGroupName            = aws_codedeploy_deployment_group.app.deployment_group_name
        TaskDefinitionTemplateArtifact = "build_output"
        TaskDefinitionTemplatePath     = "taskdef.json"
        AppSpecTemplateArtifact        = "build_output"
        AppSpecTemplatePath            = "appspec.yaml"
      }
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-codepipeline-app-01"
  })
}

# ---------------------------------------------------------------------------
# SNS Topic - thong bao pipeline Success/Failed qua CodeStar Notifications
# ---------------------------------------------------------------------------
resource "aws_sns_topic" "pipeline_alerts" {
  name = "${var.project_name}-${var.environment}-sns-cicd-01"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sns-cicd-01"
  })
}

resource "aws_sns_topic_subscription" "pipeline_alerts_email" {
  topic_arn = aws_sns_topic.pipeline_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_policy" "pipeline_alerts" {
  arn = aws_sns_topic.pipeline_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCodeStarNotificationsPublish"
      Effect    = "Allow"
      Principal = { Service = "codestar-notifications.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.pipeline_alerts.arn
    }]
  })
}

resource "aws_codestarnotifications_notification_rule" "pipeline" {
  name        = "${var.project_name}-${var.environment}-notif-cicd-01"
  resource    = aws_codepipeline.app.arn
  detail_type = "BASIC"

  event_type_ids = [
    "codepipeline-pipeline-pipeline-execution-succeeded",
    "codepipeline-pipeline-pipeline-execution-failed"
  ]

  target {
    address = aws_sns_topic.pipeline_alerts.arn
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-notif-cicd-01"
  })
}
