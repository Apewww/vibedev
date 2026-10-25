#!/bin/bash
set -e

echo "[$(date)] Starting auto-deploy..."
cd /root/vibedev_project

# 1. Pull latest code from github
git pull origin main

# 2. Rebuild frontend
cd frontend
npm install --silent
npm run build

# 3. Deploy frontend dist to CT 110 webroot
cd dist
tar czf - . | sshpass -p "raf22ly05" ssh -o StrictHostKeyChecking=no root@192.168.32.2 "pct exec 110 -- tar xzf - -C /var/www/vibedev/"

# 4. Sync backend main.py to CT 110
cat /root/vibedev_project/backend/main.py | sshpass -p "raf22ly05" ssh -o StrictHostKeyChecking=no root@192.168.32.2 "pct exec 110 -- tee /var/www/vibedev_backend.py" > /dev/null

# 5. Reload nginx & restart backend service
sshpass -p "raf22ly05" ssh -o StrictHostKeyChecking=no root@192.168.32.2 "pct exec 110 -- systemctl reload nginx && pct exec 110 -- systemctl restart vibedev-api.service"

echo "[$(date)] Auto-deploy completed successfully!"
