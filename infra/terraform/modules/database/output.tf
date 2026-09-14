output "rds_endpoint" {
  description = "Endpoint day du (address:port)"
  value       = aws_db_instance.this.endpoint
  sensitive   = true
}

output "rds_address" {
  description = "Hostname cua RDS instance"
  value       = aws_db_instance.this.address
  sensitive   = true
}

output "rds_port" {
  value = aws_db_instance.this.port
}

output "db_name" {
  value = aws_db_instance.this.db_name
}
