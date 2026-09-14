data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  az_suffixes = ["a", "b", "c", "d"]
  az_names    = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-vpc-01"
  })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-igw-01"
  })
}

# ---------------------------------------------------------------------------
# Public Subnet (ALB) - 1 subnet / AZ
# ---------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.az_names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-subnet-public-${local.az_suffixes[count.index]}-01"
  })
}

# ---------------------------------------------------------------------------
# Private Subnet - app tier (ECS) - 1 subnet / AZ
# ---------------------------------------------------------------------------
resource "aws_subnet" "app" {
  count             = var.az_count
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.app_subnet_cidrs[count.index]
  availability_zone = local.az_names[count.index]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-subnet-app-${local.az_suffixes[count.index]}-01"
  })
}

# ---------------------------------------------------------------------------
# Private Subnet - data tier (RDS) - 1 subnet / AZ, tach rieng khoi app tier
# ---------------------------------------------------------------------------
resource "aws_subnet" "data" {
  count             = var.az_count
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.data_subnet_cidrs[count.index]
  availability_zone = local.az_names[count.index]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-subnet-data-${local.az_suffixes[count.index]}-01"
  })
}

# ---------------------------------------------------------------------------
# NAT Gateway - so luong theo var.nat_gateway_count
# prod: bang az_count (1 NAT/AZ, khong single point of failure)
# dev: co the = 1, dung chung cho ca 2 AZ de tiet kiem chi phi (trade-off, xem terraform.tfvars)
# ---------------------------------------------------------------------------
resource "aws_eip" "nat" {
  count  = var.nat_gateway_count
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eip-nat-${local.az_suffixes[count.index]}-01"
  })
}

resource "aws_nat_gateway" "this" {
  count         = var.nat_gateway_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-nat-gateway-${local.az_suffixes[count.index]}-01"
  })

  depends_on = [aws_internet_gateway.this]
}

# ---------------------------------------------------------------------------
# Route table - Public (route ra IGW)
# ---------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rt-public-01"
  })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id              = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ---------------------------------------------------------------------------
# Route table - App tier (route ra NAT Gateway de tai update)
# Neu nat_gateway_count < az_count (truong hop dev dung chung 1 NAT), moi AZ
# van co route table rieng nhung tro ve cung 1 NAT Gateway (index 0).
# ---------------------------------------------------------------------------
resource "aws_route_table" "app" {
  count  = var.az_count
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rt-app-${local.az_suffixes[count.index]}-01"
  })
}

resource "aws_route" "app_nat" {
  count                  = var.az_count
  route_table_id         = aws_route_table.app[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[min(count.index, var.nat_gateway_count - 1)].id
}

resource "aws_route_table_association" "app" {
  count          = var.az_count
  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app[count.index].id
}

# ---------------------------------------------------------------------------
# Route table - Data tier (mac dinh KHONG co route ra Internet, RDS khong public)
# ---------------------------------------------------------------------------
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rt-data-01"
  })
}

# Route ra IGW cho Data Subnet - CHI tao khi var.data_subnet_internet_access_enabled=true.
# Day la ngoai le tam thoi cho dev de RDS publicly_accessible co the nhan traffic
# tu Internet (vd seed data tu may ca nhan qua allowed_ip_cidrs o module security).
resource "aws_route" "data_internet" {
  count                  = var.data_subnet_internet_access_enabled ? 1 : 0
  route_table_id         = aws_route_table.data.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "data" {
  count          = var.az_count
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}
