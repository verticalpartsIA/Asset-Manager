#!/bin/bash
# Deploy do Asset-Manager na Hostinger (modelo "pull" via HTTPS).
# Executado por cron na conta u926853941. Idempotente: so reinstala/reinicia
# quando o main mudou (ou quando node_modules ainda nao existe).
set -e

APP_DIR="/home/u926853941/domains/assetmanager.vpsistema.com/public_html"
cd "$APP_DIR"

git fetch origin main

CHANGED=0
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  git reset --hard origin/main
  CHANGED=1
fi

if [ "$CHANGED" = "1" ] || [ ! -d node_modules ]; then
  npm ci --omit=dev || npm install --omit=dev
  mkdir -p tmp && touch tmp/restart.txt
  echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') atualizado para $(git rev-parse --short HEAD)"
else
  echo "[deploy] $(date '+%Y-%m-%d %H:%M:%S') sem mudancas ($(git rev-parse --short HEAD))"
fi
