output "artifact_bucket_name" {
  value = aws_s3_bucket.artifacts.bucket
}

output "artifact_bucket_arn" {
  value = aws_s3_bucket.artifacts.arn
}

output "codebuild_project_name" {
  value = aws_codebuild_project.app.name
}

output "codedeploy_app_name" {
  value = aws_codedeploy_app.app.name
}

output "codedeploy_deployment_group_name" {
  value = aws_codedeploy_deployment_group.app.deployment_group_name
}

output "codepipeline_name" {
  value = aws_codepipeline.app.name
}

output "codepipeline_arn" {
  value = aws_codepipeline.app.arn
}

output "sns_topic_arn" {
  value = aws_sns_topic.pipeline_alerts.arn
}
