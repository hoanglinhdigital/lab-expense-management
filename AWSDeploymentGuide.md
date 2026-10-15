# Hướng dẫn triển khai Expense Management lên AWS (ECS Fargate + ECR + RDS + Secrets Manager + ALB)

> **Đối tượng:** học viên mới bắt đầu với AWS (beginner).
> **Cách làm:** 100% **AWS Console** (giao diện web) và **AWS CLI**. Không dùng Terraform / CloudFormation.
> **Thời gian ước tính:** 2 – 3 giờ (RDS tạo mất ~10 phút, phần còn lại là thao tác).
> **Region dùng trong lab:** `ap-northeast-1` (Tokyo).

---

## Mục lục

0. [Tổng quan & kiến trúc](#0-tổng-quan--kiến-trúc)
1. [Chuẩn bị](#1-chuẩn-bị)
2. [Bước 1 – Xác định VPC & Subnet](#bước-1--xác-định-vpc--subnet)
3. [Bước 2 – Tạo Security Group](#bước-2--tạo-security-group)
4. [Bước 3 – ECR: tạo repository, build & push Docker image](#bước-3--ecr-tạo-repository-build--push-docker-image)
5. [Bước 4 – RDS MySQL](#bước-4--rds-mysql)
6. [Bước 5 – Secrets Manager](#bước-5--secrets-manager)
7. [Bước 6 – IAM Role cho ECS (Task Execution Role)](#bước-6--iam-role-cho-ecs-task-execution-role)
8. [Bước 7 – Application Load Balancer (ALB) & Target Group](#bước-7--application-load-balancer-alb--target-group)
9. [Bước 8 – ECS Fargate: cluster, task definition, service](#bước-8--ecs-fargate-cluster-task-definition-service)
10. [Bước 9 – Kiểm tra ứng dụng](#bước-9--kiểm-tra-ứng-dụng)
11. [Bước 10 – (Tuỳ chọn) Cập nhật phiên bản mới](#bước-10--tuỳ-chọn-cập-nhật-phiên-bản-mới)
12. [Xử lý sự cố thường gặp](#xử-lý-sự-cố-thường-gặp)
13. [Bước 11 – DỌN DẸP TÀI NGUYÊN (bắt buộc)](#bước-11--dọn-dẹp-tài-nguyên-bắt-buộc)

---

## 0. Tổng quan & kiến trúc

### 0.1. Ứng dụng này chạy như thế nào trong container?

Đọc nhanh `Dockerfile` và `docker/entrypoint.sh` của project để hiểu những gì AWS sẽ chạy:

- Image build 3 giai đoạn (`deps` → `builder` → `runner`), chạy **Next.js standalone** ở **port 3000**.
- Khi container khởi động, `entrypoint.sh` tự chạy:
  1. `prisma migrate deploy` – tạo/cập nhật bảng trong database.
  2. `prisma db seed` – nạp dữ liệu mẫu (idempotent – chạy lại nhiều lần vẫn an toàn). Chỉ chạy khi `RUN_DB_SEED=true`.
  3. `node server.js` – khởi động web server.
- Ứng dụng đọc cấu hình từ **biến môi trường**:

| Biến | Giá trị trong lab | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | lấy từ **Secrets Manager** | Chuỗi kết nối MySQL, chứa mật khẩu nên **không** để lộ trong task definition |
| `RUN_DB_SEED` | `true` | Tự migrate + seed khi container start |
| `DATABASE_SSL` | `false` | Kết nối RDS không bật TLS (xem giải thích ở [Bước 5](#bước-5--secrets-manager)) |
| `COOKIE_SECURE` | `false` | ALB trong lab chỉ có HTTP (chưa có HTTPS) nên cookie phải bỏ cờ `Secure`, nếu không đăng nhập xong sẽ mất session |

### 0.2. Sơ đồ kiến trúc

```
                         Internet
                            │  HTTP :80
                   ┌────────▼─────────┐
                   │ Application Load │  SG: expense-mgmt-dev-sg-alb-01
                   │ Balancer (ALB)   │  (mở port 80 cho mọi nơi)
                   └────────┬─────────┘
                            │ HTTP :3000  (chỉ nhận từ SG của ALB)
                   ┌────────▼─────────┐        ┌─────────────────────┐
                   │ ECS Fargate Task │───────►│ Secrets Manager     │
                   │ (Next.js :3000)  │ lấy    │ DATABASE_URL        │
                   │ SG: ...-sg-ecs-01│ secret └─────────────────────┘
                   └───┬──────────┬───┘
        kéo image      │          │ MySQL :3306 (chỉ nhận từ SG của ECS)
   ┌───────────────┐   │   ┌──────▼───────────┐
   │ Amazon ECR    │◄──┘   │ RDS MySQL 8.0    │  SG: ...-sg-rds-01
   │ (Docker image)│       │ (không public)   │
   └───────────────┘       └──────────────────┘
        Log của container ──► CloudWatch Logs  (/ecs/expense-mgmt-dev-app-01)
```

> **Đơn giản hoá cho lab (đánh đổi có chủ đích):**
> - Dùng **Default VPC** và subnet public có sẵn → không cần tạo VPC/NAT Gateway (NAT Gateway tốn ~32 USD/tháng).
> - ECS task được gán **public IP** để kéo image từ ECR; nhưng Security Group chỉ cho phép traffic **từ ALB** vào task, nên Internet không gọi thẳng vào task được.
> - RDS **không public**, chỉ nhận kết nối từ Security Group của ECS.
> - Chỉ **1 task**, RDS **Single-AZ**, HTTP (không HTTPS).
>
> Môi trường **production thật** cần: subnet private + NAT/VPC Endpoint, RDS Multi-AZ, HTTPS (ACM) trên ALB, tối thiểu 2 task, bật TLS tới RDS.

### 0.3. Quy ước đặt tên

Theo convention của project: `{system}-{environment}-{resource}-{số thứ tự}`

- `system` = `expense-mgmt`, `environment` = `dev`
- Ví dụ: `expense-mgmt-dev-sg-alb-01`, `expense-mgmt-dev-rds-mysql-01`

> ✋ **Nếu nhiều học viên dùng chung 1 AWS account**, hãy đổi `dev` thành tên riêng (ví dụ `linh`) để không đụng tên resource của nhau.

### 0.4. Chi phí ước tính

| Resource | Ghi chú | Chi phí ước tính |
|---|---|---|
| ALB | tính theo giờ + lưu lượng | ~0.025 USD/giờ |
| Fargate 0.5 vCPU / 1 GB | 1 task | ~0.03 USD/giờ |
| RDS `db.t3.micro` | Single-AZ, 20 GB gp3 | ~0.03 USD/giờ (có thể nằm trong free tier/credit của tài khoản mới) |
| Public IPv4 | ALB (2 IP) + task (1 IP) | ~0.005 USD/giờ/IP |
| Secrets Manager | 1 secret | ~0.40 USD/tháng (30 ngày đầu miễn phí) |
| ECR, CloudWatch Logs | dung lượng nhỏ | gần như 0 |

👉 **Tổng khoảng 0.1 – 0.15 USD/giờ (≈ 2.5 – 3.5 USD/ngày)**. Đây là số ước tính, giá thực tế xem tại trang AWS Pricing. **Làm xong lab hãy dọn dẹp ngay (Bước 11)** để không bị tính tiền ngoài ý muốn.

---

## 1. Chuẩn bị

### 1.1. Công cụ cần cài trên máy

| Công cụ | Kiểm tra | Ghi chú |
|---|---|---|
| **AWS CLI v2** | `aws --version` | [Hướng dẫn cài](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| **Docker Desktop** | `docker version` | Phải đang **chạy** (biểu tượng cá voi xanh) |
| **Git Bash** (Windows) hoặc Terminal (macOS/Linux) | — | Mọi lệnh trong guide viết theo cú pháp **bash**. Windows hãy mở **Git Bash**, **không dùng** CMD/PowerShell |
| **Source code project** | `cd` vào thư mục `lab-expense-management` | Cần để build Docker image |

### 1.2. Tạo tài khoản AWS & bật cảnh báo chi phí

1. Đăng ký tại <https://aws.amazon.com> (cần thẻ thanh toán quốc tế).
2. **Không dùng root user để làm lab.** Đăng nhập root một lần để làm bước 1.3 rồi chuyển sang IAM user.
3. **Tạo Budget cảnh báo chi phí** (rất nên làm):
   - Console → thanh tìm kiếm gõ **Billing and Cost Management** → menu trái **Budgets** → **Create budget**.
   - Chọn **Use a template** → **Monthly cost budget** → nhập ngân sách `10` USD, nhập email nhận cảnh báo → **Create budget**.

### 1.3. Tạo IAM user cho lab & cấu hình AWS CLI

1. Console → **IAM** → **Users** → **Create user**.
   - User name: `lab-expense-admin`
   - Bật **Provide user access to the AWS Management Console** (tuỳ chọn, nếu muốn đăng nhập bằng user này) → đặt mật khẩu.
   - **Next** → **Attach policies directly** → tick **AdministratorAccess** → **Next** → **Create user**.
   > ⚠️ `AdministratorAccess` chỉ phù hợp cho tài khoản học tập. Môi trường thật phải dùng quyền tối thiểu.
2. Vào user vừa tạo → tab **Security credentials** → **Create access key** → chọn use case **Command Line Interface (CLI)** → tick xác nhận → **Create access key**.
3. **Lưu lại** `Access key ID` và `Secret access key` (chỉ hiện 1 lần). **Không commit, không gửi cho ai.**
4. Mở terminal (Git Bash) và chạy:

```bash
aws configure
# AWS Access Key ID [None]:      <dán Access key ID>
# AWS Secret Access Key [None]:  <dán Secret access key>
# Default region name [None]:    ap-northeast-1
# Default output format [None]:  json
```

5. Kiểm tra đã đăng nhập đúng:

```bash
aws sts get-caller-identity
```

✅ Kết quả phải hiện `Account` (12 chữ số) và `Arn` chứa `user/lab-expense-admin`.

> 💡 Trên Console, **luôn kiểm tra region ở góc trên bên phải là `Asia Pacific (Tokyo) ap-northeast-1`**. Sai region là lỗi phổ biến nhất khiến bạn "không thấy resource".

### 1.4. Tạo file biến môi trường cho lab

Các bước sau dùng nhiều ID/ARN. Để khỏi phải copy tay mỗi lần mở lại terminal, ta lưu vào một file **nằm ngoài thư mục project** (tránh commit nhầm).

```bash
mkdir -p ~/expense-lab

cat > ~/expense-lab/lab-env.sh <<'EOF'
# ===== Cấu hình chung của lab =====
export AWS_REGION=ap-northeast-1
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_PAGER=""                 # tắt trình xem phân trang của AWS CLI
export MSYS_NO_PATHCONV=1           # Git Bash: không tự đổi "/ecs/..." thành đường dẫn Windows

export PROJECT=expense-mgmt
export ENVIRONMENT=dev              # đổi nếu dùng chung account với người khác
export PREFIX="${PROJECT}-${ENVIRONMENT}"

# Git Bash trên Windows: AWS CLI hay trả về ký tự '\r' thừa cuối dòng làm hỏng biến.
# Hàm bọc này lọc '\r' đi (trên macOS/Linux không ảnh hưởng gì).
aws() { command aws "$@" | tr -d '\r'; return "${PIPESTATUS[0]}"; }

# Hàm lưu biến vào file này: dùng sau khi gán biến, ví dụ:  save_var VPC_ID
save_var() { echo "export $1=\"${!1}\"" >> ~/expense-lab/lab-env.sh; }
EOF

# Nạp file vào terminal hiện tại
source ~/expense-lab/lab-env.sh

# Lấy Account ID và lưu lại
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "ACCOUNT_ID=$ACCOUNT_ID"
save_var ACCOUNT_ID
```

> 🔁 **Quan trọng:** mỗi khi **mở terminal mới** hoặc **bị mất biến**, chạy lại:
> ```bash
> source ~/expense-lab/lab-env.sh
> ```
> (Chạy `aws configure` **trước** khi `source` file này lần đầu, vì hàm bọc `aws` làm ẩn các câu hỏi tương tác của `aws configure`.)

---

## Bước 1 – Xác định VPC & Subnet

**VPC** là mạng ảo riêng của bạn trên AWS; **subnet** là mạng con nằm trong 1 Availability Zone (AZ). Tài khoản AWS mới đã có sẵn **Default VPC** với mỗi AZ một subnet public.

```bash
source ~/expense-lab/lab-env.sh

# 1. Lấy ID của Default VPC
VPC_ID=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true \
  --query 'Vpcs[0].VpcId' --output text)
echo "VPC_ID=$VPC_ID"
```

> Nếu kết quả là `None` (account đã xoá Default VPC) → tạo lại bằng `aws ec2 create-default-vpc` rồi chạy lại lệnh trên.

```bash
save_var VPC_ID

# 2. Liệt kê các subnet của Default VPC
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=$VPC_ID Name=default-for-az,Values=true \
  --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' --output table
```

Chọn **2 subnet thuộc 2 AZ khác nhau** (ALB và RDS bắt buộc phải có ≥ 2 AZ) và gán vào biến:

```bash
SUBNET_1=subnet-xxxxxxxx      # thay bằng ID subnet thứ nhất trong bảng trên
SUBNET_2=subnet-yyyyyyyy      # thay bằng ID subnet thứ hai (AZ khác)
save_var SUBNET_1
save_var SUBNET_2
```

✅ **Kiểm tra:** `echo $VPC_ID $SUBNET_1 $SUBNET_2` in ra 3 giá trị bắt đầu bằng `vpc-` / `subnet-`.

---

## Bước 2 – Tạo Security Group

**Security Group (SG)** là tường lửa ảo gắn vào từng resource. Ta tạo 3 SG theo mô hình "mỗi tầng chỉ nhận traffic từ tầng ngay trước nó":

| SG | Cho phép đi vào (Inbound) | Từ nguồn |
|---|---|---|
| `expense-mgmt-dev-sg-alb-01` | HTTP – TCP **80** | `0.0.0.0/0` (mọi nơi) |
| `expense-mgmt-dev-sg-ecs-01` | Custom TCP **3000** | SG của ALB |
| `expense-mgmt-dev-sg-rds-01` | MySQL/Aurora – TCP **3306** | SG của ECS |

> Outbound để mặc định (cho phép tất cả) – ECS cần ra Internet để kéo image & gọi Secrets Manager.

**Làm trên Console** – tạo **theo đúng thứ tự ALB → ECS → RDS** (vì SG sau tham chiếu SG trước):

1. Console → **VPC** → menu trái **Security** → **Security groups** → **Create security group**.

**① SG cho ALB**
- Security group name: `expense-mgmt-dev-sg-alb-01`
- Description: `ALB cho expense management`
- VPC: chọn **Default VPC** (ID trùng `$VPC_ID`).
- **Inbound rules** → **Add rule**: Type **HTTP**, Source **Anywhere-IPv4** (`0.0.0.0/0`).
- **Create security group**.

**② SG cho ECS**
- Name: `expense-mgmt-dev-sg-ecs-01`, Description: `ECS task expense management`, VPC: Default VPC.
- **Inbound rules** → **Add rule**: Type **Custom TCP**, Port range **3000**, Source **Custom** → gõ `sg-alb` rồi chọn SG `expense-mgmt-dev-sg-alb-01` trong danh sách gợi ý.
- **Create security group**.

**③ SG cho RDS**
- Name: `expense-mgmt-dev-sg-rds-01`, Description: `RDS MySQL expense management`, VPC: Default VPC.
- **Inbound rules** → **Add rule**: Type **MYSQL/Aurora** (port 3306), Source **Custom** → chọn SG `expense-mgmt-dev-sg-ecs-01`.
- **Create security group**.

**Lấy ID các SG về terminal:**

```bash
SG_ALB=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=$PREFIX-sg-alb-01 Name=vpc-id,Values=$VPC_ID \
  --query 'SecurityGroups[0].GroupId' --output text)
SG_ECS=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=$PREFIX-sg-ecs-01 Name=vpc-id,Values=$VPC_ID \
  --query 'SecurityGroups[0].GroupId' --output text)
SG_RDS=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=$PREFIX-sg-rds-01 Name=vpc-id,Values=$VPC_ID \
  --query 'SecurityGroups[0].GroupId' --output text)
echo "SG_ALB=$SG_ALB  SG_ECS=$SG_ECS  SG_RDS=$SG_RDS"
save_var SG_ALB; save_var SG_ECS; save_var SG_RDS
```

✅ **Kiểm tra:** cả 3 biến có dạng `sg-xxxxxxxx` (không phải `None`). Nếu `None` → tên SG gõ sai hoặc tạo nhầm region.

---

## Bước 3 – ECR: tạo repository, build & push Docker image

**Amazon ECR** là nơi lưu Docker image riêng (giống Docker Hub nhưng nằm trong AWS).

### 3.1. Tạo repository (Console)

1. Console → **Elastic Container Registry** → **Create repository** (hoặc **Private registry → Repositories → Create repository**).
2. **Visibility settings**: **Private**.
3. **Repository name**: `expense-mgmt-dev-ecr-app-01`.
4. **Image tag mutability**: `Mutable` (mặc định).
5. Bật **Scan on push** (quét lỗ hổng bảo mật miễn phí – nếu giao diện hiển thị tuỳ chọn này).
6. **Create**.

### 3.2. Build & push image (CLI)

```bash
ECR_REPO=$PREFIX-ecr-app-01
ECR_REGISTRY=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
IMAGE_TAG=v1
save_var ECR_REPO; save_var ECR_REGISTRY; save_var IMAGE_TAG

# 1. Đăng nhập Docker vào ECR (token có hiệu lực 12 giờ)
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ECR_REGISTRY
```

✅ Kết quả: `Login Succeeded`.

```bash
# 2. Vào thư mục gốc của project (nơi có Dockerfile)
cd "/d/Project Code/Claude/lab-expense-management"     # đổi lại đúng đường dẫn trên máy bạn

# 3. Build image. --platform linux/amd64 để chạy được trên Fargate (x86_64),
#    kể cả khi bạn build trên máy Mac chip Apple Silicon (ARM).
docker build --platform linux/amd64 -t $ECR_REPO:$IMAGE_TAG .

# 4. Gắn tag trỏ về ECR và push lên
docker tag $ECR_REPO:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
docker push $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
```

> ⏱️ Lần build đầu mất vài phút (tải Node image, `npm ci`, `next build`). Lần push đầu tải vài trăm MB.
> 🔒 `.dockerignore` đã loại `.env` nên **mật khẩu/biến môi trường local không bị đóng gói vào image**.

```bash
# 5. Xác nhận image đã có trên ECR
aws ecr describe-images --repository-name $ECR_REPO \
  --query 'imageDetails[*].[imageTags[0],imageSizeInBytes,imagePushedAt]' --output table
```

✅ **Kiểm tra:** bảng hiển thị tag `v1`. Có thể xem thêm trên Console → ECR → repository → tab **Images**.

---

## Bước 4 – RDS MySQL

**Amazon RDS** là database được AWS quản lý (backup, patch, giám sát). Project dùng **MySQL 8.x**.

### 4.1. Sinh mật khẩu database (CLI)

Mật khẩu sẽ nằm trong chuỗi `DATABASE_URL` (dạng URL), nên **không dùng ký tự đặc biệt** như `@ : / ? # %` – nếu không URL sẽ bị sai. Ta nhờ AWS sinh mật khẩu chỉ gồm chữ + số:

```bash
DB_PASSWORD=$(aws secretsmanager get-random-password \
  --password-length 24 --exclude-punctuation \
  --query RandomPassword --output text)
DB_USERNAME=app_user
DB_NAME=expense_db
save_var DB_PASSWORD; save_var DB_USERNAME; save_var DB_NAME

echo "Username: $DB_USERNAME"
echo "Password: $DB_PASSWORD"
```

Giữ cửa sổ này để copy mật khẩu vào Console ở bước sau.

> ⚠️ Mật khẩu được lưu tạm trong `~/expense-lab/lab-env.sh` để tiện làm lab. File này sẽ bị xoá ở bước dọn dẹp. **Không bao giờ** làm vậy ở môi trường thật – hãy dùng Secrets Manager.

### 4.2. Tạo RDS instance (Console)

Console → **Aurora and RDS** → **Databases** → **Create database**.

| Mục | Giá trị |
|---|---|
| Choose a database creation method | **Standard create** |
| Engine type | **MySQL** |
| Engine version | **MySQL 8.0.x** (bản mặc định/mới nhất của 8.0) |
| Templates | **Free tier** nếu có; không có thì **Dev/Test** |
| Availability and durability | **Single-AZ DB instance deployment (1 instance)** |
| DB instance identifier | `expense-mgmt-dev-rds-mysql-01` |
| Master username | `app_user` |
| Credentials management | **Self managed** |
| Master password / Confirm | dán `$DB_PASSWORD` ở bước 4.1 |
| DB instance class | **Burstable classes (includes t classes)** → `db.t3.micro` |
| Storage type | **General Purpose SSD (gp3)** |
| Allocated storage | `20` GiB |
| Storage autoscaling | **Bỏ tick** *Enable storage autoscaling* (tránh phát sinh chi phí) |
| Compute resource | **Don't connect to an EC2 compute resource** |
| Network type | IPv4 |
| Virtual private cloud (VPC) | **Default VPC** |
| DB subnet group | `default` (hoặc `default-vpc-xxxx`) |
| Public access | **No** ⬅ quan trọng |
| VPC security group (firewall) | **Choose existing** → bỏ `default`, chọn **`expense-mgmt-dev-sg-rds-01`** |
| Availability Zone | No preference |

Mở rộng mục **Additional configuration**:

| Mục | Giá trị |
|---|---|
| **Initial database name** | `expense_db` ⬅ **bắt buộc nhập**, nếu để trống RDS sẽ không tạo database |
| Backup retention period | `1 day` |
| Enable Enhanced monitoring | Bỏ tick |
| Enable deletion protection | **Bỏ tick** (nếu bật sẽ không xoá được ở bước dọn dẹp) |

Kéo xuống cuối, kiểm tra bảng ước tính chi phí → **Create database**.

> ⏱️ Trạng thái chuyển `Creating` → `Backing-up` → **`Available`** mất khoảng **5 – 10 phút**. Trong lúc chờ có thể làm tiếp [Bước 6](#bước-6--iam-role-cho-ecs-task-execution-role) và [Bước 7](#bước-7--application-load-balancer-alb--target-group).

### 4.3. Lấy endpoint của RDS

1. Truy cập AWS Console → **RDS** → **Databases** → chọn instance `expense-mgmt-dev-rds-mysql-01` (chờ **Status = Available**).
2. Mở tab **Connectivity & security**, copy giá trị **Endpoint**, có dạng:
   `expense-mgmt-dev-rds-mysql-01.xxxxxxxx.ap-northeast-1.rds.amazonaws.com`
3. Gán vào biến trong terminal (dán endpoint vừa copy vào giữa dấu nháy):

```bash
RDS_ENDPOINT="<dán Endpoint của RDS vào đây>"
save_var RDS_ENDPOINT
```

✅ **Kiểm tra:** ngay trong tab **Connectivity & security**, mục **Publicly accessible** phải là **No**, và **VPC security groups** là `expense-mgmt-dev-sg-rds-01`. Chạy `echo $RDS_ENDPOINT` phải in ra đúng endpoint (không có dấu cách hay dấu nháy thừa).

---

## Bước 5 – Secrets Manager

**AWS Secrets Manager** lưu thông tin nhạy cảm (mật khẩu DB). ECS sẽ **tự đọc secret lúc khởi động task** và đưa vào container dưới dạng biến môi trường `DATABASE_URL` – mật khẩu không xuất hiện trong task definition hay trong code.

### 5.1. Dựng chuỗi `DATABASE_URL`

```bash
DATABASE_URL="mysql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:3306/${DB_NAME}"
echo "$DATABASE_URL"
```

Định dạng: `mysql://<user>:<password>@<endpoint>:3306/<tên-database>`

> **Vì sao không có `?ssl=true` và vì sao đặt `DATABASE_SSL=false` ở task definition?**
> Hàm `resolveDatabaseUrl()` (`src/lib/db-connection.ts`) tự thêm `ssl=true` khi host không phải localhost. Driver MariaDB khi bật `ssl=true` sẽ **kiểm tra chứng chỉ** của server, mà chứng chỉ RDS được ký bởi *Amazon RDS CA* (Node.js không tin cậy sẵn) → lỗi `self-signed certificate in certificate chain`. Trong lab, DB nằm trong VPC và SG chỉ cho phép ECS truy cập nên ta tắt TLS cho đơn giản. Production nên bật TLS và nạp bộ chứng chỉ `global-bundle.pem` của RDS.

### 5.2. Tạo secret (Console)

1. Console → **Secrets Manager** → **Store a new secret**.
2. **Secret type**: **Other type of secret**.
3. Chuyển sang tab **Plaintext**, xoá nội dung mẫu, dán đúng chuỗi `DATABASE_URL` ở bước 5.1 (một dòng, không có dấu nháy, không xuống dòng).
4. **Encryption key**: `aws/secretsmanager` (mặc định) → **Next**.
5. **Secret name**: `expense-mgmt-dev-secret-database-url-01` → **Next**.
6. **Configure rotation**: để mặc định (tắt) → **Next** → **Store**.

<details>
<summary>💡 Cách nhanh bằng CLI (thay cho 5.2)</summary>

```bash
aws secretsmanager create-secret \
  --name $PREFIX-secret-database-url-01 \
  --description "DATABASE_URL cho expense management" \
  --secret-string "$DATABASE_URL"
```
</details>

### 5.3. Lấy ARN của secret

1. Truy cập AWS Console → **Secrets Manager** → **Secrets** → chọn secret `expense-mgmt-dev-secret-database-url-01`.
2. Ở phần **Secret details**, copy giá trị **Secret ARN**, có dạng:
   `arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:expense-mgmt-dev-secret-database-url-01-AbCdEf`
   (đuôi 6 ký tự ngẫu nhiên là bình thường).
3. Gán vào biến trong terminal (dán ARN vừa copy vào giữa dấu nháy):

```bash
SECRET_ARN="<dán Secret ARN vào đây>"
save_var SECRET_ARN
```

✅ **Kiểm tra:** `echo $SECRET_ARN` in ra ARN bắt đầu bằng `arn:aws:secretsmanager:ap-northeast-1:` và khớp với ARN hiển thị trên Console.

---

## Bước 6 – IAM Role cho ECS (Task Execution Role)

Khi ECS khởi động task, chính **ECS agent** (không phải code của bạn) cần quyền để: **kéo image từ ECR**, **ghi log lên CloudWatch** và **đọc secret từ Secrets Manager**. Các quyền đó nằm trong **Task Execution Role**.

> App này không gọi dịch vụ AWS nào khác nên **không cần Task Role** riêng.

### 6.1. Tạo role (Console)

1. Console → **IAM** → **Roles** → **Create role**.
2. **Trusted entity type**: **AWS service**.
3. **Use case**: chọn **Elastic Container Service** → radio **Elastic Container Service Task** → **Next**.
4. Ở trang *Add permissions*: tìm và tick policy **`AmazonECSTaskExecutionRolePolicy`** → **Next**.
5. **Role name**: `expense-mgmt-dev-role-ecs-execution-01` → **Create role**.

### 6.2. Cho phép đọc secret (Console)

Policy ở trên chưa có quyền đọc Secrets Manager. Thêm *inline policy* **chỉ cho đúng 1 secret** (nguyên tắc quyền tối thiểu – least privilege):

1. IAM → **Roles** → mở role `expense-mgmt-dev-role-ecs-execution-01`.
2. Tab **Permissions** → **Add permissions** → **Create inline policy**.
3. Chọn tab **JSON**, dán đoạn sau và **thay `<SECRET_ARN>`** bằng ARN của secret đã lấy ở bước 5.3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadDatabaseUrlSecret",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "<SECRET_ARN>"
    }
  ]
}
```

4. **Next** → Policy name: `expense-mgmt-dev-policy-read-secret-01` → **Create policy**.

### 6.3. Lấy ARN của role

1. Truy cập AWS Console → **IAM** → **Roles** → chọn role `expense-mgmt-dev-role-ecs-execution-01`.
2. Ở phần **Summary**, copy giá trị **ARN**, có dạng:
   `arn:aws:iam::123456789012:role/expense-mgmt-dev-role-ecs-execution-01`
3. Gán vào biến trong terminal (dán ARN vừa copy vào giữa dấu nháy):

```bash
EXEC_ROLE_ARN="<dán ARN của role vào đây>"
save_var EXEC_ROLE_ARN
```

✅ **Kiểm tra:** ở tab **Permissions** của role phải thấy 2 policy: `AmazonECSTaskExecutionRolePolicy` (AWS managed) và `expense-mgmt-dev-policy-read-secret-01` (inline). Chạy `echo $EXEC_ROLE_ARN` phải in ra ARN bắt đầu bằng `arn:aws:iam::`.

---

## Bước 7 – Application Load Balancer (ALB) & Target Group

**ALB** nhận request HTTP từ Internet rồi chuyển tới các ECS task. **Target Group** là danh sách đích (các task) mà ALB chuyển tới, kèm cấu hình **health check** (ALB định kỳ gọi thử task, task nào không phản hồi sẽ bị loại ra).

### 7.1. Tạo Target Group (Console) – làm TRƯỚC ALB

Console → **EC2** → menu trái **Load Balancing** → **Target Groups** → **Create target group**.

| Mục | Giá trị |
|---|---|
| Choose a target type | **IP addresses** ⬅ bắt buộc với Fargate |
| Target group name | `expense-mgmt-dev-tg-app-01` |
| Protocol : Port | **HTTP** : **3000** |
| IP address type | IPv4 |
| VPC | **Default VPC** |
| Protocol version | HTTP1 |
| Health check protocol | HTTP |
| **Health check path** | **`/login`** |

Mở **Advanced health check settings**:

| Mục | Giá trị |
|---|---|
| Healthy threshold | `2` |
| Unhealthy threshold | `3` |
| Timeout | `5` seconds |
| Interval | `30` seconds |
| **Success codes** | `200-399` |

**Next** → ở trang **Register targets**: **không đăng ký IP nào** (ECS sẽ tự đăng ký task) → bấm **Create target group**.

> **Vì sao health check path là `/login`, không phải `/`?** Khi chưa đăng nhập, `/` bị `src/proxy.ts` chuyển hướng (307) sang `/login`. Dùng thẳng `/login` trả về 200, rõ ràng và không phụ thuộc vào redirect.

### 7.2. Tạo ALB (Console)

Console → **EC2** → **Load Balancers** → **Create load balancer** → **Application Load Balancer** → **Create**.

| Mục | Giá trị |
|---|---|
| Load balancer name | `expense-mgmt-dev-alb-01` |
| Scheme | **Internet-facing** |
| IP address type | IPv4 |
| VPC | **Default VPC** |
| Availability Zones and subnets | **Tick ≥ 2 AZ** (nên tick đúng 2 AZ chứa `$SUBNET_1`, `$SUBNET_2`) |
| Security groups | **Bỏ `default`**, chọn **`expense-mgmt-dev-sg-alb-01`** |
| Listeners and routing | Protocol **HTTP**, Port **80**, **Default action: Forward to** → `expense-mgmt-dev-tg-app-01` |

Kéo xuống cuối → **Create load balancer**.

> ⏱️ ALB ở trạng thái `Provisioning` ~2-3 phút rồi chuyển `Active`.

### 7.3. Lấy ARN/DNS (CLI)

```bash
TG_ARN=$(aws elbv2 describe-target-groups --names $PREFIX-tg-app-01 \
  --query 'TargetGroups[0].TargetGroupArn' --output text)
ALB_ARN=$(aws elbv2 describe-load-balancers --names $PREFIX-alb-01 \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)
ALB_DNS=$(aws elbv2 describe-load-balancers --names $PREFIX-alb-01 \
  --query 'LoadBalancers[0].DNSName' --output text)
echo "ALB_DNS=$ALB_DNS"
save_var TG_ARN; save_var ALB_ARN; save_var ALB_DNS
```

✅ **Kiểm tra:** `ALB_DNS` có dạng `expense-mgmt-dev-alb-01-123456789.ap-northeast-1.elb.amazonaws.com`. Lúc này mở URL đó trên trình duyệt sẽ báo **`503 Service Temporarily Unavailable`** – hoàn toàn bình thường vì chưa có task nào phía sau.

---

## Bước 8 – ECS Fargate: cluster, task definition, service

Ba khái niệm cần nhớ:

- **Cluster**: nhóm logic chứa các service/task.
- **Task definition**: "bản thiết kế" của container (image nào, bao nhiêu CPU/RAM, biến môi trường, secret, log…).
- **Service**: giữ cho luôn có đúng N task chạy (task chết thì tự tạo lại) và gắn task vào ALB.

### 8.1. Tạo CloudWatch Log Group (CLI)

Nơi container ghi log. Giữ 7 ngày cho đỡ tốn dung lượng.

```bash
LOG_GROUP=/ecs/$PREFIX-app-01
save_var LOG_GROUP

aws logs create-log-group --log-group-name $LOG_GROUP
aws logs put-retention-policy --log-group-name $LOG_GROUP --retention-in-days 7
```

> Nếu báo `ResourceAlreadyExistsException` nghĩa là log group đã tồn tại – bỏ qua.

### 8.2. Tạo ECS Cluster (Console)

1. Console → **Elastic Container Service** → **Clusters** → **Create cluster**.
2. **Cluster name**: `expense-mgmt-dev-ecs-cluster-01`.
3. **Infrastructure**: giữ **AWS Fargate (serverless)** (đã tick sẵn).
4. Mục *Monitoring*: để tắt (Container Insights tốn thêm phí).
5. **Create**.

```bash
CLUSTER=$PREFIX-ecs-cluster-01
save_var CLUSTER
aws ecs describe-clusters --clusters $CLUSTER --query 'clusters[0].[clusterName,status]' --output text
```

✅ Kết quả: `expense-mgmt-dev-ecs-cluster-01  ACTIVE`.

### 8.3. Tạo Task Definition (CLI)

Tạo file `taskdef.json` (các biến `$...` sẽ được bash tự điền):

```bash
cd ~/expense-lab

CONTAINER_NAME=$PREFIX-container-app-01
TASK_FAMILY=$PREFIX-task-app-01
save_var CONTAINER_NAME; save_var TASK_FAMILY

cat > taskdef.json <<EOF
{
  "family": "$TASK_FAMILY",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": {
    "cpuArchitecture": "X86_64",
    "operatingSystemFamily": "LINUX"
  },
  "executionRoleArn": "$EXEC_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "$CONTAINER_NAME",
      "image": "$ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG",
      "essential": true,
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "RUN_DB_SEED",   "value": "true"  },
        { "name": "DATABASE_SSL",  "value": "false" },
        { "name": "COOKIE_SECURE", "value": "false" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "$SECRET_ARN" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "$LOG_GROUP",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Kiểm tra các giá trị đã được điền đủ (không còn $ hay chuỗi rỗng)
cat taskdef.json

# Đăng ký task definition
aws ecs register-task-definition --cli-input-json file://taskdef.json \
  --query 'taskDefinition.[family,revision,status]' --output text
```

✅ Kết quả: `expense-mgmt-dev-task-app-01  1  ACTIVE`.

Giải thích các giá trị chính:

| Trường | Ý nghĩa |
|---|---|
| `cpu` `512` / `memory` `1024` | 0.5 vCPU / 1 GB RAM. Đủ cho lab; lần start đầu cần RAM để chạy `prisma migrate` + `seed` |
| `runtimePlatform` X86_64 | Khớp với `--platform linux/amd64` lúc build image |
| `environment` | Biến không nhạy cảm, hiển thị công khai trong task definition |
| `secrets` | ECS đọc `SECRET_ARN` từ Secrets Manager và gán vào biến `DATABASE_URL` của container |
| `logConfiguration` | Đẩy stdout/stderr của container vào CloudWatch Logs |

> 💡 Cũng có thể tạo trên Console: **ECS → Task definitions → Create new task definition → Create new task definition with JSON**, rồi dán nội dung `taskdef.json`.

### 8.4. Tạo ECS Service (Console)

1. Console → **ECS** → **Clusters** → `expense-mgmt-dev-ecs-cluster-01` → tab **Services** → **Create**.
2. **Compute configuration**: **Launch type** → **Launch type**: `FARGATE`, **Platform version**: `LATEST`.
3. **Deployment configuration**:
   - Application type: **Service**
   - Task definition → Family: `expense-mgmt-dev-task-app-01`, Revision: **latest**
   - Service name: `expense-mgmt-dev-ecs-service-01`
   - Desired tasks: `1`
4. **Networking** (mở rộng):
   - VPC: **Default VPC**
   - Subnets: chọn **2 subnet** `$SUBNET_1`, `$SUBNET_2` (bỏ subnet thừa nếu có)
   - Security group: **Use an existing security group** → chỉ chọn **`expense-mgmt-dev-sg-ecs-01`** (xoá `default`)
   - **Public IP**: **Turned on** ⬅ để task kéo được image từ ECR & đọc Secrets Manager qua Internet
5. **Load balancing** (mở rộng):
   - Load balancing type: **Application Load Balancer**
   - Container: `expense-mgmt-dev-container-app-01 3000:3000`
   - Application Load Balancer: **Use an existing load balancer** → `expense-mgmt-dev-alb-01`
   - Listener: **Use an existing listener** → `80:HTTP`
   - Target group: **Use an existing target group** → `expense-mgmt-dev-tg-app-01`
   - **Health check grace period**: `180` giây ⬅ rất quan trọng: lần đầu task cần thời gian migrate + seed DB, nếu không đặt, ALB sẽ coi task là "unhealthy" và giết nó giữa chừng.
6. Các mục còn lại để mặc định → **Create**.

<details>
<summary>💡 Cách tương đương bằng CLI (thay cho 8.4)</summary>

```bash
aws ecs create-service \
  --cluster $CLUSTER \
  --service-name $PREFIX-ecs-service-01 \
  --task-definition $TASK_FAMILY \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SG_ECS],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=3000" \
  --health-check-grace-period-seconds 180
```
</details>

### 8.5. Chờ service ổn định

```bash
SERVICE=$PREFIX-ecs-service-01
save_var SERVICE

# Chờ tối đa ~10 phút cho đến khi service "steady state"
aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE

aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
  --query 'services[0].[status,desiredCount,runningCount]' --output text
```

✅ Kết quả mong đợi: `ACTIVE  1  1`.

Trong lúc chờ, theo dõi trên Console: **ECS → Cluster → Service → tab Tasks / Events / Logs**. Trạng thái task đi qua `PROVISIONING` → `PENDING` → `RUNNING`.

---

## Bước 9 – Kiểm tra ứng dụng

### 9.1. Xem log của container (CLI)

```bash
aws logs tail $LOG_GROUP --since 30m
```

Log khởi động thành công sẽ có các dòng:

```
[entrypoint] Ap dung Prisma migration (migrate deploy)...
...  migrations applied ...
[entrypoint] Seed du lieu mau (idempotent - an toan khi chay lai moi lan start)...
[entrypoint] Khoi dong Next.js server...
✓ Ready in ...ms
```

### 9.2. Kiểm tra Target Group khoẻ mạnh

```bash
aws elbv2 describe-target-health --target-group-arn $TG_ARN \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' --output text
```

✅ Mong đợi: `10.x.x.x  healthy`. Nếu là `initial` hãy chờ thêm 1–2 phút; nếu `unhealthy` xem phần [Xử lý sự cố](#xử-lý-sự-cố-thường-gặp).

### 9.3. Mở ứng dụng

```bash
echo "http://$ALB_DNS"
curl -I http://$ALB_DNS/login
```

✅ `curl` trả về `HTTP/1.1 200 OK`. Mở `http://<ALB_DNS>` trên trình duyệt (phải dùng **http://**, không phải https://) → tự chuyển sang trang đăng nhập.

Thử luồng chính:

1. Đăng nhập bằng tài khoản mẫu do seed tạo: **`demo@example.com`** / **`password123`**
   (hoặc bấm **Đăng ký** để tạo tài khoản mới).
2. Kiểm tra thấy danh sách tài khoản, danh mục, giao dịch mẫu.
3. Thêm một khoản chi tiêu mới → tải lại trang → dữ liệu vẫn còn (chứng tỏ app ghi được vào RDS).
4. Đăng xuất rồi đăng nhập lại để xác nhận session cookie hoạt động.

> ⚠️ Tài khoản `demo@example.com` có mật khẩu công khai trong source code – chỉ dùng cho lab, đừng để môi trường thật có tài khoản này.

---

## Bước 10 – (Tuỳ chọn) Cập nhật phiên bản mới

Khi sửa code và muốn deploy lại:

```bash
# 1. Build + push image với tag mới
cd "/d/Project Code/Claude/lab-expense-management"
IMAGE_TAG=v2
docker build --platform linux/amd64 -t $ECR_REPO:$IMAGE_TAG .
docker tag $ECR_REPO:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
docker push $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG

# 2. Đăng ký task definition revision mới trỏ tới tag mới
cd ~/expense-lab
sed -i "s#:v1\"#:$IMAGE_TAG\"#" taskdef.json
aws ecs register-task-definition --cli-input-json file://taskdef.json \
  --query 'taskDefinition.revision' --output text

# 3. Cập nhật service dùng revision mới nhất (ECS tự rolling update, không downtime)
aws ecs update-service --cluster $CLUSTER --service $SERVICE \
  --task-definition $TASK_FAMILY --force-new-deployment \
  --query 'service.deployments[*].[status,rolloutState]' --output text
aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE
```

> Nếu bạn đã thêm migration Prisma mới, `entrypoint.sh` sẽ tự áp dụng khi task mới khởi động.
> Khi đổi tag lần sau, sửa lại chuỗi trong lệnh `sed` cho khớp tag hiện có trong `taskdef.json`.

---

## Xử lý sự cố thường gặp

Cách chẩn đoán chung:

```bash
# Lý do task bị dừng gần nhất
aws ecs list-tasks --cluster $CLUSTER --desired-status STOPPED --query 'taskArns[0]' --output text
aws ecs describe-tasks --cluster $CLUSTER --tasks <task-arn-ở-trên> \
  --query 'tasks[0].[stopCode,stoppedReason]' --output text

# Log ứng dụng
aws logs tail $LOG_GROUP --since 1h

# Sự kiện của service
aws ecs describe-services --cluster $CLUSTER --services $SERVICE \
  --query 'services[0].events[0:5].message' --output text
```

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Task dừng, lý do `CannotPullContainerError` / `ResourceInitializationError: unable to pull ... image` | Task **không có public IP** hoặc tag image sai / chưa push | Service phải bật **Public IP = ON** và subnet là subnet public của Default VPC. Kiểm tra `aws ecr describe-images` có đúng tag không |
| `ResourceInitializationError: unable to pull secrets ... AccessDeniedException` | Execution role thiếu quyền đọc secret hoặc ARN trong policy sai | Làm lại [Bước 6.2](#62-cho-phép-đọc-secret-console); đảm bảo `Resource` đúng bằng `$SECRET_ARN` |
| `ResourceInitializationError: ... ResourceNotFoundException` (secret) | Sai ARN/Region của secret | So lại `valueFrom` trong `taskdef.json` với `echo $SECRET_ARN` |
| Log báo `Can't reach database server` / `ETIMEDOUT` / `Connection refused` | SG của RDS không cho SG của ECS; hoặc sai endpoint/mật khẩu trong `DATABASE_URL` | Kiểm tra inbound `sg-rds-01`: MySQL 3306 từ `sg-ecs-01`. In lại `echo $DATABASE_URL` và so với secret |
| Log báo `Access denied for user` | Mật khẩu trong secret ≠ mật khẩu RDS | Console → RDS → **Modify** để đặt lại mật khẩu, rồi cập nhật secret (Secrets Manager → secret → **Retrieve secret value → Edit**) và `aws ecs update-service ... --force-new-deployment` |
| Log báo `Unknown database 'expense_db'` | Khi tạo RDS đã bỏ trống *Initial database name* | Phải xoá RDS tạo lại với `expense_db` (hoặc kết nối tạo database thủ công) |
| Log báo `self-signed certificate in certificate chain` | `DATABASE_SSL` chưa là `false` | Kiểm tra `environment` trong task definition có `DATABASE_SSL=false` |
| Target `unhealthy`, task bị ECS kill liên tục | Health check sai path/port, hoặc grace period quá ngắn | Target group: path `/login`, port `3000`, success `200-399`; service: grace period `180`+ |
| ALB trả `502 Bad Gateway` | Container chưa lắng nghe port 3000 hoặc SG ECS không mở 3000 từ ALB | Kiểm tra inbound `sg-ecs-01`: TCP 3000 từ `sg-alb-01` |
| ALB trả `503` | Chưa có target healthy nào | Chờ task `RUNNING` + health check pass; xem `describe-target-health` |
| Truy cập `http://<ALB_DNS>` timeout | `sg-alb-01` chưa mở port 80; hoặc đang gõ `https://` | Mở inbound HTTP 80 `0.0.0.0/0`; dùng `http://` |
| Đăng nhập "thành công" nhưng bị đẩy về trang login | Cookie `Secure` không lưu được trên HTTP | Kiểm tra `COOKIE_SECURE=false` trong task definition |
| `Login Succeeded` nhưng `docker push` báo `no basic auth credentials` | Token ECR hết hạn (12 giờ) hoặc sai region | Chạy lại lệnh `aws ecr get-login-password ...` |
| `exec format error` trong log | Image build sai kiến trúc (ARM) | Build lại với `--platform linux/amd64` |
| Biến CLI có ký tự lạ, lệnh báo `Invalid ...` | Chưa `source` file env hoặc dính ký tự `\r` (Windows) | `source ~/expense-lab/lab-env.sh` (đã có hàm lọc `\r`) |

---

## Bước 11 – DỌN DẸP TÀI NGUYÊN (bắt buộc)

> 🧹 **Làm ngay sau khi học xong.** ALB, Fargate, RDS tính tiền theo giờ.
> **Thứ tự xoá rất quan trọng** (resource nào đang được resource khác sử dụng thì chưa xoá được): `ECS service → ECS cluster → ALB → Target Group → RDS → Secret → ECR → Log group → IAM → Security Group`.

Mở terminal và nạp lại biến (nếu cần):

```bash
source ~/expense-lab/lab-env.sh
echo "Region: $AWS_REGION | Prefix: $PREFIX | Account: $ACCOUNT_ID"
```

### 11.1. Xoá ECS Service (CLI)

```bash
# Đưa số task về 0 rồi xoá service
aws ecs update-service --cluster $CLUSTER --service $SERVICE --desired-count 0 >/dev/null
aws ecs delete-service --cluster $CLUSTER --service $SERVICE --force >/dev/null
aws ecs wait services-inactive --cluster $CLUSTER --services $SERVICE
echo "Đã xoá ECS service"
```

> 🖱️ Console: ECS → Cluster → Service → **Delete service** → tick **Force delete** → gõ `delete`.

### 11.2. Hủy đăng ký Task Definition & xoá ECS Cluster (CLI)

```bash
# Deregister mọi revision của task definition (chuyển sang INACTIVE, không tốn phí)
for td in $(aws ecs list-task-definitions --family-prefix $TASK_FAMILY \
              --query 'taskDefinitionArns[]' --output text); do
  aws ecs deregister-task-definition --task-definition "$td" >/dev/null
  echo "Deregistered $td"
done

# Xoá cluster
aws ecs delete-cluster --cluster $CLUSTER --query 'cluster.status' --output text
```

✅ Kết quả: `INACTIVE`.

### 11.3. Xoá ALB và Target Group (CLI)

```bash
# Xoá ALB (listener bị xoá theo)
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN
aws elbv2 wait load-balancers-deleted --load-balancer-arns $ALB_ARN
echo "Đã xoá ALB"

# Xoá Target Group (chỉ xoá được SAU KHI ALB đã bị xoá)
aws elbv2 delete-target-group --target-group-arn $TG_ARN
echo "Đã xoá Target Group"
```

> 🖱️ Console: EC2 → **Load Balancers** → chọn ALB → **Actions → Delete**; sau đó EC2 → **Target Groups** → chọn → **Actions → Delete**.
> Nếu báo `ResourceInUse` ở Target Group: chờ ~1 phút rồi chạy lại lệnh.

### 11.4. Xoá RDS (CLI)

```bash
aws rds delete-db-instance \
  --db-instance-identifier $PREFIX-rds-mysql-01 \
  --skip-final-snapshot \
  --delete-automated-backups \
  --query 'DBInstance.DBInstanceStatus' --output text

# Chờ xoá xong (khoảng 5-10 phút)
aws rds wait db-instance-deleted --db-instance-identifier $PREFIX-rds-mysql-01
echo "Đã xoá RDS"
```

> `--skip-final-snapshot` = không giữ bản sao lưu cuối (phù hợp lab; dữ liệu sẽ **mất vĩnh viễn**).
> 🖱️ Console: RDS → Databases → chọn instance → **Actions → Delete** → bỏ tick *Create final snapshot* và *Retain automated backups* → tick xác nhận → gõ `delete me`.
> Nếu bạn đã tạo **DB subnet group** riêng ở bước 4: RDS → **Subnet groups** → xoá. (Subnet group `default` của Default VPC để nguyên.)

Kiểm tra không còn **snapshot thủ công** nào:

```bash
aws rds describe-db-snapshots --snapshot-type manual \
  --query 'DBSnapshots[*].DBSnapshotIdentifier' --output text
```

### 11.5. Xoá Secret trong Secrets Manager (CLI)

```bash
aws secretsmanager delete-secret \
  --secret-id $PREFIX-secret-database-url-01 \
  --force-delete-without-recovery \
  --query 'Name' --output text
```

> Mặc định Secrets Manager giữ secret 7–30 ngày ở trạng thái "chờ xoá" (vẫn có thể tính phí). `--force-delete-without-recovery` xoá ngay.
> 🖱️ Console: Secrets Manager → secret → **Actions → Delete secret** → *Waiting period* nhỏ nhất `7` ngày (Console không cho xoá ngay; dùng CLI nếu muốn xoá tức thì).

### 11.6. Xoá ECR repository (CLI)

```bash
aws ecr delete-repository --repository-name $ECR_REPO --force \
  --query 'repository.repositoryName' --output text
```

> `--force` xoá luôn toàn bộ image bên trong.
> 🖱️ Console: ECR → Repositories → tick repository → **Delete** → gõ `delete`.

### 11.7. Xoá CloudWatch Log Group (CLI)

```bash
aws logs delete-log-group --log-group-name $LOG_GROUP
echo "Đã xoá log group"
```

### 11.8. Xoá IAM Role (CLI)

Phải gỡ policy ra khỏi role trước khi xoá role:

```bash
aws iam detach-role-policy --role-name $PREFIX-role-ecs-execution-01 \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam delete-role-policy --role-name $PREFIX-role-ecs-execution-01 \
  --policy-name $PREFIX-policy-read-secret-01
aws iam delete-role --role-name $PREFIX-role-ecs-execution-01
echo "Đã xoá IAM role"
```

> 🖱️ Console: IAM → Roles → tick role → **Delete**.

### 11.9. Xoá Security Group (CLI)

Xoá theo thứ tự **RDS → ECS → ALB** (SG trước bị SG sau tham chiếu).

```bash
aws ec2 delete-security-group --group-id $SG_RDS
aws ec2 delete-security-group --group-id $SG_ECS
aws ec2 delete-security-group --group-id $SG_ALB
echo "Đã xoá 3 Security Group"
```

> ⏳ Nếu báo `DependencyViolation` (SG đang được dùng bởi network interface của ALB/ECS vừa xoá): **chờ 3–5 phút** rồi chạy lại lệnh.
> 🖱️ Console: VPC → Security groups → chọn → **Actions → Delete security groups**.

### 11.10. Dọn trên máy local

```bash
# Xoá image Docker local (giải phóng ổ đĩa)
docker rmi $ECR_REPO:v1 $ECR_REGISTRY/$ECR_REPO:v1 2>/dev/null
docker rmi $ECR_REPO:v2 $ECR_REGISTRY/$ECR_REPO:v2 2>/dev/null

# Xoá thư mục lab (chứa mật khẩu DB + taskdef.json)
cd ~ && rm -rf ~/expense-lab
```

**Vô hiệu & xoá Access Key của IAM user** (nếu không dùng nữa):

1. Console → **IAM** → **Users** → `lab-expense-admin` → tab **Security credentials** → **Access keys** → **Actions → Deactivate** → rồi **Delete**.
2. Nếu không dùng lại user này: **Delete user**.
3. Xoá cấu hình CLI trên máy: xoá file `~/.aws/credentials` (hoặc chạy lại `aws configure` với key khác).
4. Nếu đã tạo **Budget** chỉ cho lab này: Billing → Budgets → xoá (tuỳ chọn, Budget không tốn phí).

### 11.11. Kiểm tra lần cuối – đảm bảo không còn resource nào

Chạy lần lượt (mong đợi: trống). Đoạn lệnh dưới **không phụ thuộc** vào file `lab-env.sh` (đã bị xoá ở 11.10) nên chạy được ở terminal mới. Nếu bạn đã đổi `ENVIRONMENT` khác `dev`, giữ nguyên tiền tố `expense-mgmt` là đủ để lọc.

```bash
export AWS_REGION=ap-northeast-1 AWS_DEFAULT_REGION=ap-northeast-1 AWS_PAGER=""

echo "--- ECS clusters (mong đợi: không có expense-mgmt)";
aws ecs list-clusters --query 'clusterArns[?contains(@, `expense-mgmt`)]' --output text

echo "--- Load balancers";
aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `expense-mgmt`)].LoadBalancerName' --output text

echo "--- Target groups";
aws elbv2 describe-target-groups --query 'TargetGroups[?contains(TargetGroupName, `expense-mgmt`)].TargetGroupName' --output text

echo "--- RDS instances";
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `expense-mgmt`)].DBInstanceIdentifier' --output text

echo "--- Secrets";
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `expense-mgmt`)].Name' --output text

echo "--- ECR repositories";
aws ecr describe-repositories --query 'repositories[?contains(repositoryName, `expense-mgmt`)].repositoryName' --output text

echo "--- Log groups";
aws logs describe-log-groups --log-group-name-prefix /ecs/expense-mgmt --query 'logGroups[].logGroupName' --output text

echo "--- IAM roles";
aws iam list-roles --query 'Roles[?contains(RoleName, `expense-mgmt`)].RoleName' --output text

echo "--- Security groups";
aws ec2 describe-security-groups --filters Name=group-name,Values='expense-mgmt-*' --query 'SecurityGroups[].GroupName' --output text
```

✅ Tất cả các lệnh trên **không in ra gì** (hoặc chỉ in dòng tiêu đề) = đã dọn sạch.

Cuối cùng, **kiểm tra chi phí** để chắc chắn không còn gì chạy ngầm:

- Console → **Billing and Cost Management** → **Cost Explorer** / **Bills** → xem chi phí theo dịch vụ **ngày hôm sau** (số liệu cập nhật trễ ~24 giờ). Dịch vụ nào còn phát sinh phí (EC2-Other, ELB, RDS, ECS…) → truy tìm resource sót.
- Mục **EC2 → Elastic IPs**, **EC2 → Network Interfaces**, **RDS → Snapshots** phải trống phần của lab.

---

## Phụ lục – Tóm tắt resource đã tạo

| # | Dịch vụ | Tên resource | Tạo bằng | Xoá ở |
|---|---|---|---|---|
| 1 | Security Group | `expense-mgmt-dev-sg-alb-01`, `-sg-ecs-01`, `-sg-rds-01` | Console | 11.9 |
| 2 | ECR | `expense-mgmt-dev-ecr-app-01` | Console + CLI | 11.6 |
| 3 | RDS MySQL | `expense-mgmt-dev-rds-mysql-01` | Console | 11.4 |
| 4 | Secrets Manager | `expense-mgmt-dev-secret-database-url-01` | Console | 11.5 |
| 5 | IAM Role + inline policy | `expense-mgmt-dev-role-ecs-execution-01` | Console | 11.8 |
| 6 | Target Group | `expense-mgmt-dev-tg-app-01` | Console | 11.3 |
| 7 | ALB | `expense-mgmt-dev-alb-01` | Console | 11.3 |
| 8 | CloudWatch Log Group | `/ecs/expense-mgmt-dev-app-01` | CLI | 11.7 |
| 9 | ECS Cluster | `expense-mgmt-dev-ecs-cluster-01` | Console | 11.2 |
| 10 | ECS Task Definition | `expense-mgmt-dev-task-app-01` | CLI | 11.2 |
| 11 | ECS Service | `expense-mgmt-dev-ecs-service-01` | Console | 11.1 |
| 12 | IAM User + Access Key (lab) | `lab-expense-admin` | Console | 11.10 |
