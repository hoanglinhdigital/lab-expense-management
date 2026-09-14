resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group-01"
  subnet_ids = var.data_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group-01"
  })
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project_name}-${var.environment}-rds-mysql-01"
  engine         = "mysql"
  engine_version = var.engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.rds_sg_id]

  # Trade-off tam thoi cho dev: cho phep public IP de seed data tu may ca nhan
  # qua Internet (xem enable_public_rds_access + allowed_ip_cidrs o module
  # security, va data_subnet_internet_access_enabled o module network).
  # prod BAT BUOC false.
  publicly_accessible = var.publicly_accessible

  # Trade-off cho moi trung dev: cho phep Single-AZ (multi_az=false) de tiet kiem chi phi.
  # prod BAT BUOC multi_az = true theo skill aws-architecture-design / terraform-aws-generator.
  multi_az = var.multi_az

  backup_retention_period = var.backup_retention_period
  skip_final_snapshot     = var.environment != "prd"
  deletion_protection     = var.environment == "prd"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-mysql-01"
  })
}
