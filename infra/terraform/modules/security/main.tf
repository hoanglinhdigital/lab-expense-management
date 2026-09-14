# ---------------------------------------------------------------------------
# ALB Security Group - chi mo 80/443 ra Internet, khong mo them port nao khac
# ---------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-sg-alb-01"
  description = "ALB SG - allow HTTP/HTTPS from Internet only"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sg-alb-01"
  })
}

# ---------------------------------------------------------------------------
# ECS Service Security Group - chi nhan traffic tu SG cua ALB
# ---------------------------------------------------------------------------
resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-${var.environment}-sg-ecs-01"
  description = "ECS Service SG - allow traffic from ALB SG only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "App traffic from ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sg-ecs-01"
  })
}

# ---------------------------------------------------------------------------
# RDS Security Group - chi nhan traffic tu SG cua ECS Service (khong theo CIDR)
# ---------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-sg-rds-01"
  description = "RDS SG - allow MySQL traffic from ECS SG only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from ECS Service"
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sg-rds-01"
  })
}

# ---------------------------------------------------------------------------
# ALB test listener (CodeDeploy Blue/Green) - CHI mo cho allowed_test_cidrs,
# khong bao gio mo 0.0.0.0/0 (ALB SG chi duoc mo 80/443 ra Internet).
# ---------------------------------------------------------------------------
resource "aws_security_group_rule" "alb_test_listener" {
  count             = length(var.allowed_test_cidrs) > 0 ? 1 : 0
  type              = "ingress"
  description       = "CodeDeploy Blue/Green test listener - noi bo/QA only"
  from_port         = var.test_listener_port
  to_port           = var.test_listener_port
  protocol          = "tcp"
  cidr_blocks       = var.allowed_test_cidrs
  security_group_id = aws_security_group.alb.id
}

# Ngoai le TAM THOI cho dev: mo them ingress port DB tu danh sach IP ca nhan
# (allowed_ip_cidrs) de seed/debug data qua Internet. Chi tao khi
# enable_public_rds_access=true - KHONG bat o prod.
resource "aws_security_group_rule" "rds_public_access" {
  count             = var.enable_public_rds_access ? 1 : 0
  type              = "ingress"
  description       = "TAM THOI (dev) - MySQL tu IP ca nhan de seed data"
  from_port         = var.db_port
  to_port           = var.db_port
  protocol          = "tcp"
  cidr_blocks       = var.allowed_ip_cidrs
  security_group_id = aws_security_group.rds.id
}
