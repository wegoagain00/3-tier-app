terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- Variables ---
variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "eu-west-2"
}

variable "project_name" {
  description = "A name for the project to prefix resources."
  type        = string
  default     = "linkshortener"
}

variable "key_name" {
  description = "Name of the EC2 Key Pair to use for the instance."
  type        = string
}


# 1. Create Virtual Private Cloud (VPC)
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# 2. Create a public subnet within the VPC
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true # Instances in this subnet get a public IP

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

# 3. Create an Internet Gateway to provide internet access
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# 4. Create a custom Route Table to route traffic
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# 5. Associating Route Table with our public subnet
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}


# --- Security Group ---
resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-sg"
  description = "Allow frontend and SSH traffic"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP traffic to the frontend on port 3000
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow SSH for management
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # I recommed to restrict this to your IP address
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- EC2 Instance ---
resource "aws_instance" "app_server" {
  ami                         = "ami-0f4f4482537714bd9" # Amazon Linux 2 AMI for london (also free tier eligible)
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.public.id
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.app_sg.id]
  associate_public_ip_address = true


  tags = {
    Name = var.project_name
  }

  # It installs Docker and clones your repository to run the application.
  user_data = <<-EOF
              #!/bin/bash
              # Install Git, Docker, and Docker Compose
              yum update -y
              yum install -y git docker
              service docker start
              chkconfig docker on
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose

              # Replace this with your actual repository URL
              git clone https://github.com/wegoagain00/3-tier-web-app.git /app
              
              # Change to the app directory and run docker-compose
              cd /app
              docker-compose up -d
              EOF
}

# --- Outputs ---
output "application_url" {
  description = "URL to access the link shortener application."
  value       = "http://${aws_instance.app_server.public_ip}:3000"
}

output "instance_public_ip" {
  description = "Public IP of the EC2 instance for SSH access."
  value       = aws_instance.app_server.public_ip
}
