#!/bin/bash
set -e

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1563870838976155681/ba3jVxyQVDiyKBy6Ol86lWeYGaqHShV6sz-9boytVrebN9Nq-3Q-F21QKfMPiX3Wi9o6"

send_discord() {
  local title="$1"
  local desc="$2"
  local color="$3"
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"VibeDev Deployer\",\"embeds\":[{\"title\":\"$title\",\"description\":\"$desc\",\"color\":$color,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
    "$DISCORD_WEBHOOK" > /dev/null || true
}

echo "[$(date)] Starting auto-deploy..."
cd /root/vibedev_project

# 1. Pull latest code from github
git pull origin main
COMMIT_HASH=$(git log -1 --format="%h")
COMMIT_MSG=$(git log -1 --format="%s")
COMMIT_AUTHOR=$(git log -1 --format="%an")

send_discord "📥 New Push Detected & Pulling Code" "Commit: \`$COMMIT_HASH\`\\nPesan: **$COMMIT_MSG**\\nAuthor: **$COMMIT_AUTHOR**" 3447003

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

send_discord "✅ VibeDev Auto-Deploy Success" "Kompilasi build berhasil dan website telah live ter-update di [vibedev.raflylabs.com](https://vibedev.raflylabs.com)!" 5763719

echo "[$(date)] Auto-deploy completed successfully!"
