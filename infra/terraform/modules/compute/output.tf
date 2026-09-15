output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "alb_arn" {
  value = aws_lb.this.arn
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_service_name" {
  value = aws_ecs_service.this.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "cloudwatch_alarm_name" {
  value = aws_cloudwatch_metric_alarm.ecs_cpu_high.alarm_name
}

output "alb_listener_prod_arn" {
  description = "ARN listener prod (port 80) - dung cho CodeDeploy Blue/Green"
  value       = aws_lb_listener.http.arn
}

output "alb_listener_test_arn" {
  description = "ARN listener test (port test_listener_port) - dung cho CodeDeploy Blue/Green"
  value       = aws_lb_listener.test.arn
}

output "target_group_blue_name" {
  value = aws_lb_target_group.this.name
}

output "target_group_green_name" {
  value = aws_lb_target_group.green.name
}

output "ecs_task_family" {
  value = aws_ecs_task_definition.this.family
}

output "container_name" {
  value = "${var.project_name}-${var.environment}-container-app-01"
}

output "container_port" {
  value = var.container_port
}

output "ecs_execution_role_arn" {
  description = "ARN IAM Role execution cua ECS Task - CodePipeline can iam:PassRole khi RegisterTaskDefinition"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN IAM Role task cua ECS Task - CodePipeline can iam:PassRole khi RegisterTaskDefinition"
  value       = aws_iam_role.ecs_task.arn
}
