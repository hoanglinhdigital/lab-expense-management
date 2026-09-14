output "vpc_id" {
  value = module.network.vpc_id
}

output "alb_dns_name" {
  description = "DNS name cua ALB - dung de truy cap ung dung"
  value       = module.compute.alb_dns_name
}

output "ecr_repository_url" {
  description = "URL ECR repository - dung de docker push image"
  value       = module.storage.ecr_repository_url
}

output "ecs_cluster_name" {
  value = module.compute.ecs_cluster_name
}

output "ecs_service_name" {
  value = module.compute.ecs_service_name
}

output "rds_endpoint" {
  value     = module.database.rds_endpoint
  sensitive = true
}

output "sns_topic_arn" {
  value = module.compute.sns_topic_arn
}

output "cloudwatch_alarm_name" {
  value = module.compute.cloudwatch_alarm_name
}

output "codepipeline_name" {
  description = "Ten CodePipeline - dung de theo doi tren AWS Console"
  value       = module.cicd.codepipeline_name
}

output "codedeploy_app_name" {
  value = module.cicd.codedeploy_app_name
}

output "cicd_sns_topic_arn" {
  description = "SNS Topic nhan thong bao pipeline Success/Failed"
  value       = module.cicd.sns_topic_arn
}
