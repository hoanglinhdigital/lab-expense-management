output "vpc_id" {
  description = "ID cua VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "CIDR block cua VPC"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Danh sach ID Public Subnet (ALB), 1 phan tu / AZ"
  value       = aws_subnet.public[*].id
}

output "app_subnet_ids" {
  description = "Danh sach ID Private Subnet - app tier (ECS), 1 phan tu / AZ"
  value       = aws_subnet.app[*].id
}

output "data_subnet_ids" {
  description = "Danh sach ID Private Subnet - data tier (RDS), 1 phan tu / AZ"
  value       = aws_subnet.data[*].id
}
