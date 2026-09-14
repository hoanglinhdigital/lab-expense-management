# mxGraph style string mẫu cho từng loại shape AWS4

Dùng làm tham chiếu khi ghép `mxCell` trong file `.drawio`. Mọi `id` dưới đây chỉ là ví dụ — phải sinh id duy nhất thật (vd `vpc-1`, `az-a-1`, `subnet-public-a-1`...) cho từng cell.

## Cấu trúc lồng container (parent chain)

```
mxCell id="1" (root layer, mặc định đã có sẵn)
 └─ VPC (parent="1")
     └─ AZ-a (parent=VPC id)      └─ AZ-b (parent=VPC id)
         └─ Subnet Public A            └─ Subnet Public B
         └─ Subnet App A               └─ Subnet App B
         └─ Subnet Data A              └─ Subnet Data B
             └─ Service icon (ECS task, RDS...) đặt parent = subnet tương ứng
```

Icon connector (ALB → ECS, ECS → RDS...) là `mxCell edge="1"` với `source`/`target` trỏ tới id của icon, `parent="1"` (không nằm trong container nào).

## 1. VPC boundary (container, không tô nền, viền đứt nét tím đậm)

```xml
<mxCell id="vpc-1" value="expense-prod-vpc" style="rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;fontStyle=1;dashed=1;dashPattern=8 4;strokeColor=#5A30B5;fillColor=none;" vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="1400" height="900" as="geometry" />
</mxCell>
```

## 2. Availability Zone (container, dùng shape group AWS4)

```xml
<mxCell id="az-a-1" value="Availability Zone A" style="fillColor=none;strokeColor=#147EBA;dashed=1;verticalAlign=top;fontStyle=1;shape=mxgraph.aws4.availability_zone;" vertex="1" parent="vpc-1">
  <mxGeometry x="40" y="60" width="640" height="780" as="geometry" />
</mxCell>
```

## 3. Public Subnet (viền xanh lá, nền xanh lá nhạt)

```xml
<mxCell id="subnet-public-a-1" value="expense-prod-subnet-public-a" style="rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;fontStyle=1;strokeColor=#248814;fillColor=#E9F3E6;shape=mxgraph.aws4.subnet;" vertex="1" parent="az-a-1">
  <mxGeometry x="20" y="40" width="560" height="160" as="geometry" />
</mxCell>
```

## 4. Private Subnet (viền xanh dương, nền xanh dương nhạt) — dùng cho tier app và tier data

```xml
<mxCell id="subnet-app-a-1" value="expense-prod-subnet-app-a" style="rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;fontStyle=1;strokeColor=#147EBA;fillColor=#E6F2F8;shape=mxgraph.aws4.subnet;" vertex="1" parent="az-a-1">
  <mxGeometry x="20" y="220" width="560" height="160" as="geometry" />
</mxCell>
```

Subnet data (`expense-prod-subnet-data-a`) dùng style tương tự, đặt bên dưới subnet app trong cùng AZ.

## 5. Application Load Balancer (Network, tím #8C4FFF) — đặt trong Public Subnet

```xml
<mxCell id="alb-1" value="expense-prod-alb" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#8C4FFF;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.application_load_balancer;" vertex="1" parent="subnet-public-a-1">
  <mxGeometry x="20" y="30" width="48" height="48" as="geometry" />
</mxCell>
```

## 6. ECS Cluster / Task (Compute, cam #ED7100) — đặt trong Private Subnet "app", 1 icon/AZ

```xml
<mxCell id="ecs-task-a-1" value="expense-prod-ecs-cluster" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#ED7100;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ecs;" vertex="1" parent="subnet-app-a-1">
  <mxGeometry x="20" y="30" width="48" height="48" as="geometry" />
</mxCell>
```

## 7. ECR (Compute, cam #ED7100) — thường đặt ngoài VPC, cạnh CI/CD, không thuộc subnet nào

```xml
<mxCell id="ecr-1" value="expense-prod-ecr-app" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#ED7100;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elastic_container_registry;" vertex="1" parent="1">
  <mxGeometry x="1500" y="80" width="48" height="48" as="geometry" />
</mxCell>
```

## 8. RDS Multi-AZ (Database, xanh dương #3B48CC) — đặt vắt giữa 2 subnet data của 2 AZ, thường nằm ngoài container AZ (parent = VPC) để dễ vẽ line nối tới cả 2 bên

```xml
<mxCell id="rds-1" value="expense-prod-rds-mysql" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#3B48CC;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;" vertex="1" parent="vpc-1">
  <mxGeometry x="680" y="700" width="48" height="48" as="geometry" />
</mxCell>
```

## 9. CloudWatch Alarm (Management & Governance, hồng #E7157B) — đặt lệch bên cạnh, ngoài trục traffic chính

```xml
<mxCell id="cw-alarm-1" value="expense-prod-alarm-cpu-high" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#E7157B;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudwatch_alarm;" vertex="1" parent="1">
  <mxGeometry x="1500" y="400" width="48" height="48" as="geometry" />
</mxCell>
```

## 10. SNS (Application Integration, đỏ hồng #E7157B) — đặt cạnh CloudWatch Alarm, nhận alert

```xml
<mxCell id="sns-1" value="expense-prod-sns-alert" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#E7157B;strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sns;" vertex="1" parent="1">
  <mxGeometry x="1500" y="480" width="48" height="48" as="geometry" />
</mxCell>
```

## 11. Edge (đường nối) mẫu — ALB → ECS

```xml
<mxCell id="edge-alb-ecs-a" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;elbow=vertical;" edge="1" parent="1" source="alb-1" target="ecs-task-a-1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

Áp dụng pattern tương tự cho: ECS → RDS (mỗi AZ), CloudWatch Alarm → SNS, ECR → ECS (deploy, có thể vẽ nét đứt để phân biệt với luồng traffic thật).
