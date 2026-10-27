#!/bin/sh
set -eu

mkdir -p /app/data /tmp/blevin_chat_sessions /home/node/.codex
chown -R node:node /app/data /tmp/blevin_chat_sessions /home/node/.codex

CODEX_CONFIG=/home/node/.codex/config.toml
if [ ! -f "$CODEX_CONFIG" ]; then
  cp /etc/blevin/codex-chatbot-profile.toml "$CODEX_CONFIG"
elif ! grep -q "^\[profiles\\.chatbot\]" "$CODEX_CONFIG"; then
  printf "\n" >> "$CODEX_CONFIG"
  cat /etc/blevin/codex-chatbot-profile.toml >> "$CODEX_CONFIG"
fi
chown node:node "$CODEX_CONFIG"

if [ ! -f /home/node/.codex/auth.json ]; then
  echo "[codex] No auth found in /home/node/.codex."
  echo "[codex] Run once: docker compose exec web codex login"
fi

# Ensure DB tables exist (standalone builds may not run getDb() init reliably).
node /app/init-db.js || echo "[entrypoint] WARNING: DB init failed"

exec gosu node "$@"
