
---
name: terraform-aws-generator
description: Tự động áp dụng mỗi khi người dùng yêu cầu sinh hoặc chỉnh sửa Terraform cho hạ tầng AWS. Quy định vị trí lưu file, best practice AWS, ràng buộc bảo mật, và nguyên tắc an toàn vận hành (không tự chạy terraform apply/destroy).
---

# Terraform AWS Generator

Khi người dùng yêu cầu sinh mới hoặc chỉnh sửa code Terraform cho hạ tầng AWS, Claude PHẢI tuân thủ đầy đủ 4 nhóm quy tắc dưới đây, không có ngoại lệ trừ khi người dùng yêu cầu rõ ràng và có ý thức về việc phá vỡ quy tắc.

## 1. Vị trí lưu file (bắt buộc)

- Toàn bộ file Terraform lưu tại `infra/terraform/`. KHÔNG lưu rải rác ở thư mục gốc project.
- Cấu trúc thư mục bắt buộc:
infra/terraform/
├── modules/
│ ├── network/ (main.tf, variable.tf, output.tf)
│ ├── compute/ (main.tf, variable.tf, output.tf)
│ ├── database/ (main.tf, variable.tf, output.tf)
│ ├── storage/ (main.tf, variable.tf, output.tf)
│ └── security/ (main.tf, variable.tf, output.tf)
├── environments/
│ ├── dev/ (main.tf, variable.tf, terraform.tfvars, output.tf)
│ ├── stg/ (main.tf, variable.tf, terraform.tfvars, output.tf)
│ └── prd/ (main.tf, variable.tf, terraform.tfvars, output.tf)
└── .terraform/ (tự sinh khi chạy terraform init, KHÔNG commit lên Git)

- Mỗi module chỉ chịu trách nhiệm cho một nhóm resource (network, compute, database, storage, security). Output của module này có thể làm input cho module khác (vd: output của `network` là input của `security`, `database`, `storage`, `compute`).
- Mỗi module phải có file `terraform.tfvars.example` liệt kê đầy đủ biến cần khai báo nhưng KHÔNG chứa giá trị thật/secret.
## 2. Naming convention (bắt buộc)
- Tên resource phải có tiền tố là `{project_name}-{environment}-{resource_type}-01`, ví dụ `expense-dev-ecs-cluster-01`, `expense-prd-rds-mysql-01`.
- Các Tag chuẩn bắt buộc: `Project`, `Environment`, `ManagedBy = "Terraform"`. Các tag khác có thể thêm nhưng không được xung đột với tag chuẩn.
- Các biến environment (dev/stg/prd) phải được khai báo trong file `terraform.tfvars` của từng môi trường, KHÔNG hardcode trong file `.tf`. 
## 3. Best practice của AWS (bắt buộc)

- Pin version provider rõ ràng, ví dụ `hashicorp/aws ~> 5.0`. Không để version trôi tự do.
- Dùng data source (`data "aws_ami"`, `data "aws_availability_zones"`, v.v.) thay vì hardcode ID hoặc AZ.
- Mọi resource phải có tag chuẩn: `Project`, `Environment`, `ManagedBy = "Terraform"`.
- Bật encryption mặc định:
  - RDS: `storage_encrypted = true`
  - ECR: bật image scanning on push
  - S3 (nếu có): bật server-side encryption
- ECS Service dùng Fargate:
  - `desired_count` tối thiểu 2 khi `environment = prod`
  - Được phép giảm còn 1 ở `dev` để tiết kiệm chi phí, nhưng PHẢI ghi rõ comment ngay tại resource nói rõ đây là trade-off cho môi trường dev.
- RDS:
  - `environment = prod` → bắt buộc `multi_az = true`
  - `environment = dev` → cho phép `multi_az = false`, nhưng PHẢI ghi rõ comment trade-off ngay tại resource đó.

## 4. Ràng buộc bảo mật (bắt buộc)

- Security Group của RDS chỉ được nhận traffic từ đúng Security Group của ECS Service (không mở theo CIDR range).
- Security Group của ECS Service chỉ nhận traffic từ đúng Security Group của ALB.
- Security Group của ALB chỉ mở port 80/443 ra Internet — không mở thêm port nào khác ra `0.0.0.0/0`.
- Mật khẩu database KHÔNG bao giờ hardcode plaintext trong file `.tf`. Dùng biến `sensitive = true`, giá trị lấy từ `terraform.tfvars` (đã gitignore) hoặc AWS Secrets Manager.
- IAM Role/Policy cho ECS Task theo nguyên tắc least-privilege, không dùng `Resource = "*"`.

## 5. Nguyên tắc an toàn vận hành (QUAN TRỌNG NHẤT — tuân thủ tuyệt đối)

- Claude TUYỆT ĐỐI KHÔNG được tự ý chạy: `terraform init`, `terraform plan`, `terraform apply`, `terraform destroy`, hay bất kỳ lệnh AWS CLI nào làm thay đổi hạ tầng thật.
- Claude chỉ được phép:
  1. Sinh/sửa file `.tf`
  2. Giải thích thay đổi bằng ngôn ngữ dễ hiểu
  3. Đưa ra CHÍNH XÁC câu lệnh cần chạy để người dùng tự copy-paste vào terminal của họ
- Sau khi người dùng tự chạy lệnh và dán lại output/lỗi cho Claude, Claude được phép phân tích, giải thích, đề xuất sửa file — nhưng vẫn phải chờ người dùng tự chạy lại lệnh, không tự động thực thi lại.
- Nếu người dùng yêu cầu Claude "chạy giúp terraform apply" (hoặc tương đương), Claude PHẢI từ chối thực thi trực tiếp, nhắc lại nguyên tắc này, và chỉ đưa ra lệnh để người dùng tự chạy.
        