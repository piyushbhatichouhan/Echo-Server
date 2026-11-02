# Echo Server Deployment & Migration Plan: Raspberry Pi to Ubuntu Server OS 🚀

This document outlines the complete roadmap and step-by-step instructions to migrate the **Echo Server (EchoHub)** platform from a **Raspberry Pi 3B (ARM64, 1GB RAM)** to a **dedicated PC running Ubuntu Server OS (x86_64)**.

To ensure stability and zero downtime, the migration is split into two phases:
1. **Phase 1: VirtualBox Sandbox Deployment** (Full dry-run on a local VM to validate the x86_64 build, database restore, watchdog, and GitHub runner).
2. **Phase 2: Bare-Metal PC Production Deployment** (Production installation, data cutover from Pi, Cloudflare Tunnel routing switch, and 24/7 server hardening).

---

## 📊 1. Architectural Differences: Raspberry Pi vs. Ubuntu PC

| Feature | Raspberry Pi 3B (Current) | Dedicated PC (Target) | Migration Impact / Action Required |
| :--- | :--- | :--- | :--- |
| **CPU Architecture** | `ARMv8` 64-bit (`aarch64` / `arm64`) | `x86_64` (Intel / AMD 64-bit) | All binaries (runner, cloudflared) and Docker images must target `linux/amd64`. |
| **Memory (RAM)** | 1 GB LPDDR2 (Frequent OOMs during builds) | 8 GB – 32 GB+ DDR4/DDR5 | High performance; concurrent container builds and multiple apps can run without swapping. |
| **Storage Medium** | MicroSD Card (Slow I/O, wear risk) | NVMe / SATA SSD | 20x–50x faster container startup, image extraction, and database transactions. |
| **GitHub Actions Runner** | `actions-runner-linux-arm64-*.tar.gz` | `actions-runner-linux-x64-*.tar.gz` | Must install the **x64** runner binary package on Ubuntu. |
| **Cloudflare Tunnel** | `cloudflared-linux-arm64` | `cloudflared-linux-amd64` | Must install the **amd64** release package. |
| **Docker Engine** | Docker on Debian Bookworm (Raspberry Pi OS Lite) | Docker CE on Ubuntu Server 24.04 LTS | Standard Docker repository; Compose v2 natively supported. |

---

## 🧪 2. Phase 1: VirtualBox Sandbox Deployment (Step-by-Step)

Before touching your dedicated PC, we will build and test the entire stack inside an Ubuntu Server VirtualBox VM.

```
+-------------------------------------------------------------------------+
| Host Computer (Windows)                                                 |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Oracle VirtualBox VM: "echo-sandbox"                              |  |
|  | - Ubuntu Server 24.04 LTS (x86_64)                                |  |
|  | - Bridged Network Adapter (Gets LAN IP: e.g., 192.168.1.150)       |  |
|  |                                                                   |  |
|  |   [ Docker Compose ]                                              |  |
|  |   - echo-postgres (Port 5432)                                     |  |
|  |   - echo-backend (Port 3000)                                      |  |
|  |   - echo-router (Port 8080)                                       |  |
|  |   - echo-frontend (Port 8080:80)                                  |  |
|  |                                                                   |  |
|  |   [ Systemd Services ]                                            |  |
|  |   - echo-watchdog.service (Healthy monitoring)                    |  |
|  |   - actions.runner.service (Self-hosted CI/CD test)               |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

### Step 1.1: Create the VirtualBox VM
1. Download [Ubuntu Server 24.04 LTS ISO](https://ubuntu.com/download/server).
2. Open **Oracle VirtualBox** > Click **New**:
   - **Name**: `echo-sandbox`
   - **Type**: `Linux`
   - **Version**: `Ubuntu (64-bit)`
   - **Base Memory**: At least `4096 MB` (4 GB)
   - **Processors**: `2` or `4` CPUs
   - **Hard Disk**: Create virtual disk (`30 GB` or `50 GB`, Dynamically Allocated).
3. **Configure Network Adapter**:
   - Go to VM **Settings** > **Network** > **Adapter 1**.
   - Change *Attached to:* from `NAT` to **`Bridged Adapter`**.
   - Select your active Wi-Fi or Ethernet adapter.
   *(This gives the VM its own IP on your local network, allowing seamless SSH and browser testing from your Windows host).*

### Step 1.2: Install Ubuntu Server 24.04 LTS
1. Start the VM with the ISO attached.
2. Select language, keyboard, and standard network settings.
3. Storage: Use default entire disk with LVM.
4. Profile setup:
   - Your name: `echo`
   - Server name: `echo-sandbox`
   - Username: `echo`
   - Password: Choose a secure password (e.g. `Echo@2026`)
5. Enable **Install OpenSSH server** (Check the box).
6. Complete installation and reboot VM.

### Step 1.3: Connect via SSH from Windows
Open PowerShell on your Windows PC and find the VM's IP address:
```bash
# On the VM console, run:
ip a | grep inet

# From Windows PowerShell, connect via SSH:
ssh echo@<VM_IP_ADDRESS>
```

### Step 1.4: Update System & Install Prerequisite Tools
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git jq build-essential net-tools ca-certificates gnupg lsb-release

# Install Node.js 20 LTS (required on host for watchdog daemon)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Verify v20.x.x
```

### Step 1.5: Install Docker Engine & Docker Compose Plugin
```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant current user permissions to run docker commands without sudo
sudo usermod -aG docker $USER
sudo systemctl enable --now docker

# Log out and log back in to apply group change:
exit
# Reconnect:
ssh echo@<VM_IP_ADDRESS>
docker ps # Verify it runs without sudo
```

### Step 1.6: Setup Directory Hierarchy
Echo Server expects `/srv/echo` for the repository and `/srv/echo-storage` for user workspaces:
```bash
sudo mkdir -p /srv/echo
sudo mkdir -p /srv/echo-storage
sudo mkdir -p /srv/actions-runner

# Give ownership to the current user
sudo chown -R $USER:$USER /srv/echo /srv/echo-storage /srv/actions-runner
```

### Step 1.7: Clone Codebase & Configure Environment
```bash
# Clone the repository
git clone https://github.com/piyushbhatichouhan/Echo-Server.git /srv/echo
cd /srv/echo

# Verify files
ls -la
```

Create production configuration files:
```bash
# 1. Backend environment
cat << 'EOF' > /srv/echo/backend/.env
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=echo_db
DB_USER=echo_user
DB_PASSWORD=Echo@1

JWT_SECRET=EchoBackendDevelopmentSecretKey2026!SuperLongRandomString
JWT_EXPIRES_IN=7d

STORAGE_ROOT=/srv/echo-storage
PROJECTS_PATH=/srv/echo-storage/projects
GIT_PATH=/srv/echo-storage/git
CLOUD_PATH=/srv/echo-storage/cloud
BACKUPS_PATH=/srv/echo-storage/backups
PUBLISHED_PATH=/srv/echo-storage/published
MAX_UPLOAD_SIZE=104857600

GITHUB_WEBHOOK_SECRET=your_super_secret_here
USER_DELETION_GRACE_HOURS=24
USER_DELETION_JOB_INTERVAL_MS=300000

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=pbhatichouhan@gmail.com
MAIL_PASS=hxluutorrvrhwfbu
MAIL_FROM="EchoHub pbhatichouhan@gmail.com"

APP_URL=http://localhost:8080
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080
EOF

# 2. Router environment
cat << 'EOF' > /srv/echo/router/.env
PORT=8080
DB_HOST=postgres
DB_PORT=5432
DB_NAME=echo_db
DB_USER=echo_user
DB_PASSWORD=Echo@1
ROUTER_TARGET=localhost
EOF
```

### Step 1.8: Start Database & Restore Data
```bash
cd /srv/echo

# Start only PostgreSQL first
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to initialize
sleep 5
docker exec -it echo-postgres pg_isready -U echo_user -d echo_db

# Restore database from dump
docker exec -i echo-postgres psql -U echo_user -d echo_db < /srv/echo/dump-echo_db-202610290815.sql

# Normalize Windows backslashes in storage paths (ensures compatibility with Linux)
docker exec -it echo-postgres psql -U echo_user -d echo_db -c "UPDATE files SET storage_path = REPLACE(storage_path, '\\', '/'); UPDATE cloud_files SET storage_path = REPLACE(storage_path, '\\', '/');"

# Apply project_domains migration (if not already applied)
docker exec -i echo-postgres psql -U echo_user -d echo_db < /srv/echo/backend/migrations/00X_create_project_domains.sql || true

# Verify tables
docker exec -it echo-postgres psql -U echo_user -d echo_db -c "\dt"
```

### Step 1.9: Build & Launch Full Stack
```bash
cd /srv/echo

# Build and launch all services
docker compose -f docker-compose.prod.yml up -d --build

# Verify all containers are running
docker compose -f docker-compose.prod.yml ps
```

Test access from your Windows browser:
- Frontend: `http://<VM_IP_ADDRESS>:8080`
- Backend API: `http://<VM_IP_ADDRESS>:3000/api/dashboard` (or healthcheck)

### Step 1.10: Setup Watchdog as a Systemd Service
```bash
# Install watchdog dependencies (if any)
cd /srv/echo/watchdog
npm install || true

# Create systemd service unit
sudo tee /etc/systemd/system/echo-watchdog.service << EOF
[Unit]
Description=Echo Server Watchdog Daemon
After=docker.service network.target
Requires=docker.service

[Service]
Type=simple
User=echo
WorkingDirectory=/srv/echo/watchdog
ExecStart=/usr/bin/node /srv/echo/watchdog/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start watchdog
sudo systemctl daemon-reload
sudo systemctl enable --now echo-watchdog

# Check status
sudo systemctl status echo-watchdog
```

**Test Self-Healing**:
Stop a container manually:
```bash
docker stop echo-backend
# Watch watchdog logs revive it within 30 seconds!
journalctl -u echo-watchdog -f
```

### Step 1.11: Setup GitHub Actions Self-Hosted Runner (x64)
In GitHub: Go to your repo > **Settings** > **Actions** > **Runners** > **New self-hosted runner** > Choose **Linux** + **x64**.

Run the commands inside the VM:
```bash
cd /srv/actions-runner

# Download x64 runner (replace version if updated)
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# Configure runner
./config.sh --url https://github.com/piyushbhatichouhan/Echo-Server --token <YOUR_GITHUB_TOKEN>

# Install as system service
sudo ./svc.sh install echo
sudo ./svc.sh start
sudo ./svc.sh status
```

*Test*: Push a small change (e.g. documentation edit) to `main`. Watch the GitHub Action trigger, execute in the VM, and verify deployment output!

---

## 🖥 3. Phase 2: Bare-Metal PC Production Deployment

Once everything has been tested and verified in VirtualBox, you are ready for the permanent deployment on your physical PC.

### Step 2.1: BIOS & Motherboard Optimization for 24/7 Server
1. Power on the PC and press `Del` / `F2` to enter BIOS.
2. **AC Power Recovery**: Set *Restore AC Power Loss* to **"Power On"** or **"Last State"**.
   *(If your home loses electricity, the server will automatically boot when power returns).*
3. **Hardware Virtualization**: Enable `Intel Virtualization Technology (VT-x)` or `AMD-V / SVM`.
4. **Primary Boot Device**: Set your SSD as primary boot.
5. **Headless Boot**: Ensure "Halt on keyboard error" is disabled so the PC boots without a monitor/keyboard connected.

### Step 2.2: Install Ubuntu Server 24.04 LTS on Bare Metal
1. Flash Ubuntu Server 24.04 LTS onto a USB drive using Rufus or BalenaEtcher.
2. Boot PC from USB and install Ubuntu Server using the same steps validated in Phase 1.
3. Use a wired Gigabit Ethernet cable connected to your home router.
4. Set up static IP or assign a DHCP reservation on your router (e.g., `192.168.1.50`).

### Step 2.3: Replicate the Setup on the PC
Execute the identical validated steps from Phase 1:
1. System update & packages (`curl`, `git`, `docker`, `nodejs v20`).
2. Directory structure creation: `/srv/echo`, `/srv/echo-storage`, `/srv/actions-runner`.
3. Clone repository into `/srv/echo`.
4. Place production `.env` files in `backend/` and `router/`.

### Step 2.4: Data Migration from Raspberry Pi to PC
To copy live data from the active Raspberry Pi to the new PC:

#### 1. Fresh PostgreSQL Database Export from Pi:
On the Raspberry Pi:
```bash
docker exec -t echo-postgres pg_dump -U echo_user -d echo_db > /tmp/pi_echohub_latest.sql
```

#### 2. Copy Database Dump and User Files to the PC:
From the PC:
```bash
# Transfer database dump
scp echo@pi.devpiyush.in:/tmp/pi_echohub_latest.sql /srv/echo/

# Transfer all project workspaces and storage files
rsync -avz --progress echo@pi.devpiyush.in:/srv/echo-storage/ /srv/echo-storage/
```

#### 3. Restore to PC Database:
On the PC:
```bash
cd /srv/echo
docker compose -f docker-compose.prod.yml up -d postgres
sleep 5
docker exec -i echo-postgres psql -U echo_user -d echo_db < /srv/echo/pi_echohub_latest.sql
```

### Step 2.5: Setup Cloudflare Tunnel on the PC (`cloudflared`)

Install Cloudflare Tunnel (`amd64` release) on the PC:

```bash
# Download and install cloudflared deb package
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate with Cloudflare
cloudflared tunnel login
```

You can either:
- **Option A (Seamless Migration)**: Copy the tunnel credentials from the Pi to the PC (`~/.cloudflared/2cc6c092-fc57-4c68-a79f-972c6215d82d.json` and `cert.pem`).
- **Option B (New Tunnel)**: Create a fresh tunnel on the PC and re-route the domains:
  ```bash
  cloudflared tunnel create echohub-pc
  cloudflared tunnel route dns echohub-pc devpiyush.in
  cloudflared tunnel route dns echohub-pc api.devpiyush.in
  ```

Install cloudflared as a systemd service:
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### Step 2.6: Transfer GitHub Actions Runner to PC
1. Stop and uninstall runner service on Raspberry Pi:
   ```bash
   cd /srv/actions-runner
   sudo ./svc.sh stop
   sudo ./svc.sh uninstall
   ./config.sh remove --token <TOKEN>
   ```
2. Install the **x64** runner on the PC:
   ```bash
   cd /srv/actions-runner
   ./config.sh --url https://github.com/piyushbhatichouhan/Echo-Server --token <NEW_TOKEN>
   sudo ./svc.sh install echo
   sudo ./svc.sh start
   ```

### Step 2.7: Install Watchdog on PC
```bash
# Same systemd unit file from Phase 1
sudo systemctl daemon-reload
sudo systemctl enable --now echo-watchdog
```

---

## ✅ 4. Final Cutover & Verification Checklist

| # | Check Item | Verification Command | Expected Result |
| :--- | :--- | :--- | :--- |
| 1 | Docker Containers | `docker ps` | All 4 core containers (`postgres`, `backend`, `router`, `frontend`) are up. |
| 2 | Backend API Health | `curl http://localhost:3000/api/server` | Returns JSON status 200. |
| 3 | Frontend Web UI | Access `https://devpiyush.in` in browser | Loads EchoHub login/dashboard smoothly. |
| 4 | Database Persistence | `docker exec -it echo-postgres psql -U echo_user -d echo_db -c "SELECT count(*) FROM users;"` | Preserves all registered accounts and projects. |
| 5 | Dynamic App Deployment | Create test Node.js project & deploy in UI | Creates container `echohub-<id>`, routes domain, and serves app. |
| 6 | Watchdog Auto-Restart | `docker stop echo-router && sleep 35 && docker ps` | Watchdog detects and brings `echo-router` back up automatically. |
| 7 | CI/CD Trigger | `git commit --allow-empty -m "Test PC deployment" && git push` | GitHub Actions runner executes `deploy.yml` cleanly. |
| 8 | Cloudflare Tunnel | `systemctl status cloudflared` | Active (running) with connections to edge data centers. |
