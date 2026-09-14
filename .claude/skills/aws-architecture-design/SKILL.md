---
name: aws-architecture-design
description: Thiết kế và xuất bản kiến trúc hạ tầng AWS dưới dạng file .drawio (XML mxGraph) mở được trực tiếp bằng Draw.io Desktop, dùng đúng shape library mxgraph.aws4 (AWS 2019 Icons), đúng màu theo category AWS, đúng nguyên tắc High Availability (subnet theo cặp AZ, RDS Multi-AZ) và đúng resource naming convention {system}-{environment}-{ten-resource} của project. LUÔN áp dụng skill này khi user yêu cầu "thiết kế kiến trúc AWS", "vẽ sơ đồ hạ tầng", "vẽ architecture diagram", "tạo file drawio", nhắc tới VPC/subnet/ECS/RDS/ALB/CloudWatch/SNS trong ngữ cảnh sơ đồ, hoặc yêu cầu vẽ/thiết kế bất kỳ hệ thống AWS nào — kể cả khi user không nói rõ từ "drawio" hay "diagram".
---

# AWS Architecture Design (.drawio)

## Vì sao skill này tồn tại

Sơ đồ kiến trúc AWS chỉ có giá trị khi nó dùng đúng icon chuẩn AWS (không phải hình chữ nhật giả icon), thể hiện đúng nguyên tắc High Availability, và đặt tên resource đúng convention của project — để đội deploy/infra có thể đọc sơ đồ và map trực tiếp sang Terraform/Console mà không phải đoán. Mọi output của skill này PHẢI là một file `.drawio` mở được trực tiếp bằng Draw.io Desktop, không lỗi XML.

Trước khi vẽ, hỏi lại user (nếu chưa nêu rõ trong yêu cầu):
1. Số lượng Availability Zone cần dùng (mặc định: **2**).
2. Environment: dev / staging / prod (mặc định: **prod**).
3. Tên hệ thống ({system} trong naming convention) — nếu chưa rõ, suy ra từ tên project (`expense`) hoặc hỏi user.

## Quy trình vẽ

1. Xác định danh sách service cần vẽ và tier của từng service (Network, Compute, Database, Management, Integration).
2. Đặt tên resource theo convention (mục "Resource naming") TRƯỚC khi vẽ — tên này chính là label hiển thị.
3. Bố trí layout theo luồng traffic (mục "Layout & luồng traffic").
4. Vẽ theo nguyên tắc High Availability — luôn nhân đôi tier cần HA theo AZ.
5. Áp dụng đúng shape `mxgraph.aws4.*` và màu category cho từng resource (mục "Shape & màu").
6. Xuất XML `.drawio` hoàn chỉnh, kiểm tra cấu trúc `<mxfile><diagram><mxGraphModel>` hợp lệ trước khi lưu file.

## 1. Shape & màu theo category AWS4

Luôn dùng style `shape=mxgraph.aws4.<resource>;` — đây là shape library AWS 2019 Icons có sẵn trong Draw.io, không tự vẽ rectangle giả icon. Nếu không chắc tên shape chính xác cho một service, giữ nguyên tên service trong label và vẫn tô đúng màu category thay vì bỏ icon.

| Category | Màu (fill/stroke) | Ví dụ shape `mxgraph.aws4.*` |
|---|---|---|
| Compute | `#ED7100` | `ecs`, `elastic_container_registry` |
| Database | `#3B48CC` | `rds`, `rds_instance` |
| Network & Content Delivery | `#8C4FFF` | `vpc`, `subnet`, `application_load_balancer`, `availability_zone` |
| Management & Governance | `#E7157B` | `cloudwatch_alarm` |
| Application Integration | `#E7157B` (đỏ hồng nhạt hơn hoặc đỏ cam theo bảng AWS4) | `sns` |

Quy ước riêng cho container:
- **VPC boundary**: viền đứt nét (`dashed=1`), màu tím đậm, KHÔNG tô nền (`fillColor=none`).
- **Public Subnet**: viền xanh lá, nền xanh lá nhạt (vd `strokeColor=#248814;fillColor=#E9F3E6`).
- **Private Subnet**: viền xanh dương, nền xanh dương nhạt (vd `strokeColor=#147EBA;fillColor=#E6F2F8`).

Icon service (ECS, RDS, ALB...) đặt góc trên-trái hoặc căn giữa phía trên của box; label tên resource đặt ngay bên dưới icon, **in đậm** (`fontStyle=1`). Icon không được chồng lên đường line kết nối — chọn vị trí node và routing line sao cho line đi vào cạnh box, không xuyên qua icon.

## 2. Layout theo luồng traffic

Sắp xếp từ trái sang phải theo hướng đi của traffic:

```
Internet/User (bên trái ngoài cùng)
      ↓
Application Load Balancer (Public Subnet)
      ↓
Compute tier — ECS Service (Private Subnet "app", 1 subnet/AZ)
      ↓
Data tier — RDS Multi-AZ (Private Subnet "data", tách riêng khỏi subnet app)
```

CloudWatch Alarm + SNS đặt lệch sang một bên (bên phải), KHÔNG nằm trên trục traffic chính — chúng quan sát/nhận alert từ các tier khác, không nằm trong đường đi của request.

## 3. Nguyên tắc High Availability (bắt buộc)

- Mọi subnet của một tier cần HA phải đi theo **cặp tối thiểu ở 2 AZ khác nhau** (vd `subnet-public-a` và `subnet-public-b`). Không vẽ một subnet đơn lẻ cho tier cần HA.
- Mỗi Availability Zone là **1 group/container riêng**, đặt song song với các AZ khác, mỗi AZ chứa đủ các tầng subnet (public/app/data) để so sánh trực quan cạnh nhau.
- **RDS** vẽ ở chế độ Multi-AZ: icon RDS đặt ở vị trí có đường nối tới data subnet của cả 2 AZ (không đặt RDS bên trong 1 AZ box).
- **ECS Service/Task** phải có instance/task chạy ở cả 2 AZ — vẽ 2 icon ECS task (một trong mỗi AZ) dưới cùng 1 ECS Service, không dồn hết vào 1 AZ.

Nếu user yêu cầu N AZ (N > 2), nhân rộng đúng pattern trên cho từng AZ thay vì chỉ mở rộng 2 AZ đầu.

## 4. Resource naming convention (áp dụng cho MỌI resource trên sơ đồ)

Format: `{system}-{environment}-{ten-resource}` — toàn bộ chữ thường, nối bằng dấu gạch ngang.

- `{system}`: tên hệ thống/dự án, viết ngắn gọn (vd `expense`)
- `{environment}`: `dev` | `staging` | `prod`
- `{ten-resource}`: loại resource + tên gợi nhớ (vd `vpc`, `subnet-public-a`, `ecs-cluster`, `ecr-app`, `rds-mysql`, `alarm-cpu-high`, `sns-alert`)

Ví dụ: `expense-prod-vpc`, `expense-prod-subnet-app-a`, `expense-prod-subnet-app-b`, `expense-prod-ecs-cluster`, `expense-prod-rds-mysql`.

Label hiển thị trên sơ đồ PHẢI dùng đúng tên theo convention này — không dùng tên chung chung như "Database" hay "Cluster". Đặt tên trước khi vẽ (bước 2 của quy trình) để tránh phải sửa lại toàn bộ label sau.

## 5. Output — XML .drawio hợp lệ

File phải có cấu trúc:

```xml
<mxfile host="Electron">
  <diagram name="AWS Architecture" id="...">
    <mxGraphModel dx="..." dy="..." grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- mxCell cho từng VPC/AZ/Subnet/Service, style="shape=mxgraph.aws4.<resource>;..." -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Xem `references/drawio-template.md` để lấy style string mẫu đầy đủ cho từng loại shape (VPC, AZ, subnet, ECS, RDS, ALB, CloudWatch Alarm, SNS) và cách lồng container (`parent` đúng theo cấp VPC → AZ → Subnet → Service icon).

Trước khi lưu file, kiểm tra:
- Mọi `mxCell` có `id` duy nhất, `parent` trỏ đúng tới container cha (Subnet nằm trong AZ, AZ nằm trong VPC).
- Không có tag chưa đóng, không có ký tự đặc biệt chưa escape trong label (`&`, `<`, `>` → `&amp;`, `&lt;`, `&gt;`).
- File mở được bằng cách kiểm tra nhanh cấu trúc `<mxfile>` → `<diagram>` → `<mxGraphModel>` → `<root>` là còn nguyên vẹn, không bị cắt cụt.

Lưu file vào vị trí user chỉ định, hoặc `docs/mockup/<ten-he-thong>/` nếu không có chỉ định khác (theo cấu trúc thư mục docs của project — hỏi lại nếu không rõ).
