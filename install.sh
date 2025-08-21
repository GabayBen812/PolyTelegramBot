#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVICE=poly-tele-bot
UNIT=/etc/systemd/system/${SERVICE}.service

# Node (אם צריך): sudo apt update && sudo apt install -y nodejs npm
npm -v >/dev/null || { echo "Install Node.js first"; exit 1; }

cd "$APP_ROOT"
npm ci
npm run build

sudo tee "$UNIT" >/dev/null <<EOF
[Unit]
Description=Polymarket Telegram Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_ROOT}
EnvironmentFile=${APP_ROOT}/.env
ExecStart=/usr/bin/node ${APP_ROOT}/dist/index.js
Restart=always
RestartSec=5
User=${USER}
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE"
echo "OK. Logs: journalctl -u ${SERVICE} -f"
