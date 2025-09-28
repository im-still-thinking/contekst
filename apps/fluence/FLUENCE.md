# Contekst

**Contekst** is a high-performance unified memory layer designed to provide seamless context continuity across any AI application.

## 🚀 Key Features

- **Intent-based Memory Storage**: Instead of just summarizing text, it focuses on categorically capturing the user's intents, facts and summaries.
- **Fast Semantic Search**: Advanced sub-second retrieval algorithm using multiple retrieval techniques.
- **Cross-LLM Compatibility**: You can switch between different LLM platforms and still maintain the context of the conversation.
- **Decentralized Storage**: It uses a scalable cloud database hosted on a decentralized computing platform like Fluence.
- **Blockchain Integration**: Smart contracts for memory management and decentralized storage verification.
- **Browser Extension**: Seamless integration with ChatGPT and Claude for enhanced context awareness.

## 🏗️ Architecture

![Contekst Architecture](public/Mermaid%20Chart%20-%20Create%20complex%2C%20visual%20diagrams%20with%20text.%20A%20smarter%20way%20of%20creating%20diagrams.-2025-09-28-043405.svg)

Here is a complete Terraform configuration to deploy your entire application stack. This setup uses Terraform to create the VM and then uses a remote provisioner to run the service deployment script, making the entire process a single command.

### Project Structure

To keep the project organized, create the following file structure:

```
.
├── main.tf
├── variables.tf
├── outputs.tf
└── scripts/
    └── deploy_services.sh
```

### 1\. `variables.tf` - Input Variables

This file defines all the configurable parameters for your deployment, such as credentials and image names. This makes the main script reusable and keeps your secrets out of the primary configuration.

```terraform
# scripts/variables.tf

variable "fluence_api_key" {
  type        = string
  description = "Your Fluence API key. Can also be set via the FLUENCE_API_KEY environment variable."
  sensitive   = true
}

variable "ssh_public_key_path" {
  type        = string
  description = "Path to your public SSH key file (e.g., ~/.ssh/id_rsa.pub)."
  default     = "~/.ssh/id_rsa.pub"
}

variable "ssh_private_key_path" {
  type        = string
  description = "Path to your private SSH key file for provisioning."
  default     = "~/.ssh/id_rsa"
}

variable "qdrant_api_key" {
  type        = string
  description = "The API key to secure the Qdrant instance."
  sensitive   = true
}

variable "redis_password" {
  type        = string
  description = "The password for the Redis instance."
  sensitive   = true
}

variable "mysql_root_password" {
  type        = string
  description = "The root password for the MySQL instance."
  sensitive   = true
}

variable "dockerhub_username" {
  type        = string
  description = "Your Docker Hub username."
}

variable "backend_image_name" {
  type        = string
  description = "The name of your backend application's Docker image on Docker Hub."
}
```

### 2\. `scripts/deploy_services.sh` - Deployment Script

This shell script contains the logic for installing Docker and deploying all the service containers. It's designed to be uploaded and executed by Terraform.

```bash
#!/bin/bash
set -e

# --- This script is executed by Terraform on the new VM ---
# Arguments are passed from the terraform configuration
QDRANT_API_KEY="$1"
REDIS_PASSWORD="$2"
MYSQL_ROOT_PASSWORD="$3"
DOCKERHUB_USERNAME="$4"
BACKEND_IMAGE_NAME="$5"

echo "--- Waiting for cloud-init to finish ---"
cloud-init status --wait

echo "--- 1. Installing Docker Engine ---"
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
echo "Docker installed successfully."

echo "--- 2. Creating Shared Docker Network ---"
docker network create services-net |

| echo "Network 'services-net' already exists."

echo "--- 3. Deploying Qdrant ---"
docker run -d --name qdrant \
  --network services-net \
  -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  -e QDRANT__SERVICE__API_KEY="$QDRANT_API_KEY" \
  --restart always \
  qdrant/qdrant

echo "--- 4. Deploying Redis ---"
docker run -d --name redis \
  --network services-net \
  -p 6379:6379 \
  -v $(pwd)/redis_data:/data \
  --restart always \
  redis \
  redis-server --requirepass "$REDIS_PASSWORD"

echo "--- 5. Deploying MySQL ---"
docker run -d --name mysql \
  --network services-net \
  -p 3306:3306 \
  -v $(pwd)/mysql_data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  --restart always \
  mysql:latest

echo "--- 6. Pulling and Deploying Backend Application ---"
docker pull "$DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:latest"
docker run -d --name my-backend \
  --network services-net \
  -p 8080:8080 \
  -e DB_HOST="mysql" \
  -e DB_USER="root" \
  -e DB_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -e REDIS_HOST="redis" \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e QDRANT_HOST="qdrant" \
  -e QDRANT_API_KEY="$QDRANT_API_KEY" \
  --restart always \
  "$DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:latest"

echo "--- Deployment Complete! ---"
docker ps
```

### 3\. `main.tf` - Core Infrastructure and Deployment Logic

This is the main file that defines the Fluence VM and orchestrates the deployment by uploading and running the script above.

```terraform
# main.tf

terraform {
  required_providers {
    fluence = {
      source  = "decentralized-infrastructure/fluence"
      version = "1.3.0"
    }
  }
}

provider "fluence" {
  api_key = var.fluence_api_key
}

# Create an SSH key resource on Fluence from a local file
resource "fluence_ssh_key" "main_key" {
  name       = "project-backend-key"
  public_key = file(var.ssh_public_key_path)
}

# Create the Virtual Machine
resource "fluence_vm" "backend_server" {
  name                = "full-stack-server-vm"
  os_image            = "https://cloud-images.ubuntu.com/releases/22.04/release/ubuntu-22.04-server-cloudimg-amd64.img"
  ssh_keys            = [fluence_ssh_key.main_key.fingerprint]
  instances           = 1
  basic_configuration = "standard-4" # Recommended: 4 vCPU, 8 GB RAM

  # Open ports for all services
  open_ports =

  # --- Provisioning Steps ---

  # 1. Upload the deployment script to the VM
  provisioner "file" {
    source      = "scripts/deploy_services.sh"
    destination = "/home/user/deploy_services.sh"
  }

  # 2. Make the script executable and run it
  provisioner "remote-exec" {
    inline =
  }

  # Connection details for the provisioners
  connection {
    type        = "ssh"
    user        = "user"
    host        = self.public_ip
    private_key = file(var.ssh_private_key_path)
    timeout     = "5m"
  }
}
```

### 4\. `outputs.tf` - Deployment Outputs

This file defines the information that will be displayed after the deployment is successful.

```terraform
# outputs.tf

output "vm_public_ip" {
  description = "The public IP address of the deployed VM."
  value       = fluence_vm.backend_server.public_ip
}

output "backend_api_endpoint" {
  description = "The public endpoint for your backend application."
  value       = "http://${fluence_vm.backend_server.public_ip}:8080"
}

output "qdrant_dashboard" {
  description = "The public URL for the Qdrant web dashboard."
  value       = "http://${fluence_vm.backend_server.public_ip}:6333/dashboard"
}
```

### How to Use This Terraform Script

1.  **Create a `terraform.tfvars` file** in the same directory to securely provide your secrets. **Do not commit this file to version control.**

    ```
    # terraform.tfvars

    fluence_api_key     = "YOUR_FLUENCE_API_KEY"
    qdrant_api_key      = "A_VERY_SECRET_QDRANT_KEY"
    redis_password      = "A_VERY_STRONG_REDIS_PASSWORD"
    mysql_root_password = "A_STRONG_AND_SECRET_MYSQL_PASSWORD"
    dockerhub_username  = "your-dockerhub-username"
    backend_image_name  = "your-backend-app-image-name"
    ```

2.  **Initialize Terraform:** Open your terminal in the project directory and run:

    ```bash
    terraform init
    ```

3.  **Apply the Configuration:** Run the apply command to create the VM and deploy all services.

    ```bash
    terraform apply
    ```

    Terraform will show you a plan and ask for confirmation. Type `yes` to proceed. The process will take several minutes as it provisions the VM, installs Docker, and pulls all the container images.

Once finished, Terraform will display the outputs, including the public IP address and direct links to your backend API and Qdrant dashboard.