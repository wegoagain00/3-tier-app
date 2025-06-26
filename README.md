# 3-Tier URL Shortener on AWS

This project deploys a 3-tier web application (Frontend + Backend + Database) onto a single AWS EC2 instance. The entire infrastructure is provisioned using Terraform, and the application services are managed by Docker Compose.

The skills that this project has taught me:

    Infrastructure as Code: Terraform

    Cloud Provider: AWS (EC2)

    Containerization: Docker & Docker Compose

    Frontend: HTML, CSS, JavaScript, served by Nginx

    Backend: Node.js API

    Database: MongoDB


All three services run on the same instance and communicate over a private Docker network. An AWS Security Group acts as a firewall, only exposing the frontend and SSH ports to the internet.


\<image of what I have built>

# How to use this project

If you were ever curious on how to use this project
(google/youtube the following)

Its worth ensuring you have AWS CLI installed and configured, Terraform installed, an ec2 keypair created.

A Note on Your SSH Key:
For security, it's best practice to set strict permissions on your private key file and store it in the .ssh directory.

```bash
chmod 400 your-key-pair-name.pem
mv your-key-pair-name.pem ~/.ssh/
```

## Step 1: Git clone my repository
```bash
git clone https://github.com/wegoagain00/3-tier-web-app.git
cd 3-tier-web-app
```

## Step 2: Configure Terraform for Your Environment

You need to make an important change in the terraform/main.tf file before deploying.

    Secure Your SSH Access: For security, you should restrict SSH access to your IP address only. Find the aws_security_group resource and change the cidr_blocks from "0.0.0.0/0" to your IP.

Its recommended for best practice

Update the Git Repository URL: 
The EC2 instance clones this repository to run the application. In the user_data section, make sure the git clone command points to your repository.

```bash
# terraform/main.tf - line 140
# Replace this with your actual repository URL
git clone https://github.com/your-username/your-repo.git /app
```

## Step 3: Deploy the Infrastructure

Navigate to the terraform directory and run the following commands. You will be prompted to provide the name of the EC2 Key Pair you created in the prerequisites.

Initialize Terraform:
```bash
cd terraform
terraform init
```

Plan the deployment:
```bash
terraform plan -var="key_name=your-key-pair-name"
```

Apply the configuration:
```bash
terraform apply -var="key_name=your-key-pair-name"
```

After you confirm the action, Terraform will build the AWS infrastructure. When it's finished, it will output the public URL for your new application!



I will defitinely be building on this project! look out for updates!