# ---------------------------------------------------------------------------
# LUU Y: KHONG khai inline ingress/egress block trong aws_security_group o
# duoi day. AWS provider canh bao: tron inline rule voi resource rule tach
# roi (aws_security_group_rule / aws_vpc_security_group_*_rule) tren CUNG 1
# SG se gay xung dot - moi lan SG "Modifying" se dong bo lai dung list inline,
# xoa mat rule duoc tao tach roi (vd rule 8080 cho Blue/Green), gay loi
# InvalidPermission.NotFound o lan apply sau. Vi vay TOAN BO rule trong module
# nay dung resource tach roi (aws_vpc_security_group_ingress_rule/egress_rule).
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# ALB Security Group - chi mo 80/443 ra Internet, khong mo them port nao khac
# ---------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-sg-alb-01"
  description = "ALB SG - allow HTTP/HTTPS from Internet only"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sg-alb-01"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from Internet"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-alb-http-01"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from Internet"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-alb-https-01"
  })
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  ip_protocol        = "-1"
  cidr_ipv4          = "0.0.0.0/0"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-alb-egress-01"
  })
}

# ---------------------------------------------------------------------------
# ALB test listener (CodeDeploy Blue/Green) - CHI mo cho allowed_test_cidrs,
# khong bao gio mo 0.0.0.0/0 (ALB SG chi duoc mo 80/443 ra Internet). Moi
# CIDR la 1 resource rieng (aws_vpc_security_group_ingress_rule chi nhan
# dung 1 cidr_ipv4 / resource, khac aws_security_group_rule cu nhan list).
# ---------------------------------------------------------------------------
resource "aws_vpc_security_group_ingress_rule" "alb_test_listener" {
  for_each = toset(var.allowed_test_cidrs)

  security_group_id = aws_security_group.alb.id
  description       = "CodeDeploy Blue/Green test listener - noi bo/QA only"
  from_port         = var.test_listener_port
  to_port           = var.test_listener_port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-alb-test-01"
  })
}

# ---------------------------------------------------------------------------
# ECS Service Security Group - chi nhan traffic tu SG cua ALB
# ---------------------------------------------------------------------------
resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-${var.environment}-sg-ecs-01"
  description = "ECS Service SG - allow traffic from ALB SG only"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sg-ecs-01"
  })
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "App traffic from ALB"
  from_port                    = var.container_port
  to_port                      = var.container_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-ecs-ingress-01"
  })
}

resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  ip_protocol        = "-1"
  cidr_ipv4          = "0.0.0.0/0"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-ecs-egress-01"
  })
}

# ---------------------------------------------------------------------------
# RDS Security Group - chi nhan traffic tu SG cua ECS Service (khong theo CIDR)
# ---------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-sg-rds-01"
  description = "RDS SG - allow MySQL traffic from ECS SG only"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sg-rds-01"
  })
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  description                  = "MySQL from ECS Service"
  from_port                    = var.db_port
  to_port                      = var.db_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-rds-ingress-01"
  })
}

resource "aws_vpc_security_group_egress_rule" "rds_all" {
  security_group_id = aws_security_group.rds.id
  ip_protocol        = "-1"
  cidr_ipv4          = "0.0.0.0/0"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-rds-egress-01"
  })
}

# Ngoai le TAM THOI cho dev: mo them ingress port DB tu danh sach IP ca nhan
# (allowed_ip_cidrs) de seed/debug data qua Internet. Chi tao khi
# enable_public_rds_access=true - KHONG bat o prod. Moi CIDR la 1 resource rieng.
resource "aws_vpc_security_group_ingress_rule" "rds_public_access" {
  for_each = var.enable_public_rds_access ? toset(var.allowed_ip_cidrs) : toset([])

  security_group_id = aws_security_group.rds.id
  description       = "TAM THOI (dev) - MySQL tu IP ca nhan de seed data"
  from_port         = var.db_port
  to_port           = var.db_port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-sgr-rds-public-01"
  })
}
