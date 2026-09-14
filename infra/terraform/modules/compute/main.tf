data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# Application Load Balancer - internet-facing, dat trong Public Subnet
# ---------------------------------------------------------------------------
resource "aws_lb" "this" {
  name               = "${var.project_name}-${var.environment}-alb-01"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-01"
  })
}

resource "aws_lb_target_group" "this" {
  name        = "${var.project_name}-${var.environment}-tg-app-01"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200-399"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-tg-app-01"
  })
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# ---------------------------------------------------------------------------
# Target Group + Listener "green" - danh cho CodeDeploy Blue/Green (ECS).
# Target Group "this" o tren dong vai tro "blue". Listener test chi nhan
# traffic tu CIDR noi bo (xem module security: allowed_test_cidrs), khong
# bao gio mo 0.0.0.0/0 tren port nay.
# ---------------------------------------------------------------------------
resource "aws_lb_target_group" "green" {
  name        = "${var.project_name}-${var.environment}-tg-app-02"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200-399"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-tg-app-02"
  })
}

resource "aws_lb_listener" "test" {
  load_balancer_arn = aws_lb.this.arn
  port              = var.test_listener_port
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.green.arn
  }
}

# ---------------------------------------------------------------------------
# ECS Cluster (Fargate)
# ---------------------------------------------------------------------------
resource "aws_ecs_cluster" "this" {
  name = "${var.project_name}-${var.environment}-ecs-cluster-01"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecs-cluster-01"
  })
}

# ---------------------------------------------------------------------------
# IAM Role - Execution role (pull image ECR + ghi log CloudWatch)
# ---------------------------------------------------------------------------
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-${var.environment}-role-ecs-execution-01"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-role-ecs-execution-01"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ---------------------------------------------------------------------------
# IAM Role - Task role (least-privilege, khong Resource = "*")
# App hien tai chi can ket noi RDS qua network, khong goi AWS SDK nao khac
# nen task role khong gan them policy - giu dung nguyen tac least-privilege.
# ---------------------------------------------------------------------------
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-${var.environment}-role-ecs-task-01"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-role-ecs-task-01"
  })
}

# ---------------------------------------------------------------------------
# CloudWatch Log Group cho ECS Task
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-${var.environment}-app-01"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-log-group-ecs-01"
  })
}

# ---------------------------------------------------------------------------
# ECS Task Definition - Fargate, container Next.js port 3000
# DATABASE_URL truyen qua bien sensitive var.database_url, khong hardcode password.
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "this" {
  family                   = "${var.project_name}-${var.environment}-task-app-01"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-${var.environment}-container-app-01"
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DATABASE_URL"
          value = var.database_url
        },
        {
          name  = "RUN_DB_SEED"
          value = tostring(var.run_db_seed)
        },
        {
          # App chi tat TLS khi gia tri DUNG BANG chuoi "false" (xem
          # resolveDatabaseUrl trong src/lib/db-connection.ts).
          name  = "DATABASE_SSL"
          value = var.database_ssl_enabled ? "true" : "false"
        },
        {
          # App chi tat cookie Secure khi gia tri DUNG BANG chuoi "false" (xem
          # isCookieSecure trong src/lib/api/session.ts).
          name  = "COOKIE_SECURE"
          value = var.cookie_secure_enabled ? "true" : "false"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-task-app-01"
  })
}

# ---------------------------------------------------------------------------
# ECS Service
# prod: desired_count toi thieu 2. dev: cho phep 1 de tiet kiem chi phi (trade-off).
# ---------------------------------------------------------------------------
resource "aws_ecs_service" "this" {
  name            = "${var.project_name}-${var.environment}-ecs-service-01"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.app_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name    = "${var.project_name}-${var.environment}-container-app-01"
    container_port    = var.container_port
  }

  # Deploy qua CodeDeploy (Blue/Green) thay vi ECS rolling update mac dinh.
  deployment_controller {
    type = "CODE_DEPLOY"
  }

  depends_on = [aws_lb_listener.http, aws_lb_listener.test]

  # Sau lan tao dau tien, CodeDeploy so huu task_definition dang chay va cap
  # nhat lai target_group_arn trong load_balancer moi lan Blue/Green - Terraform
  # khong duoc ghi de de tranh xung dot voi CodeDeploy.
  lifecycle {
    ignore_changes = [task_definition, load_balancer]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecs-service-01"
  })
}

# ---------------------------------------------------------------------------
# SNS Topic - nhan canh bao tu CloudWatch Alarm, 1 email subscription
# ---------------------------------------------------------------------------
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-sns-alert-01"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sns-alert-01"
  })
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ---------------------------------------------------------------------------
# CloudWatch Alarm - CPUUtilization ECS Service > threshold trong 5 phut
# period=300s x evaluation_periods=1 = 5 phut
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-alarm-cpu-high-01"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "CPUUtilization cua ECS Service ${aws_ecs_service.this.name} vuot ${var.cpu_alarm_threshold}% trong 5 phut"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.this.name
    ServiceName = aws_ecs_service.this.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alarm-cpu-high-01"
  })
}
