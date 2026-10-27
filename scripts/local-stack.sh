#!/usr/bin/env bash
# Local-only Docker stack helper. Mirrors the prsm-website pattern:
# isolated docker compose project name + pinned port to keep local work
# from colliding with the live tunneled deployment.
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:?PROJECT_NAME required}"
WEB_PORT="${WEB_PORT:?WEB_PORT required}"

action="${1:?action required: up | down | ps}"
shift || true

# Local stack uses ONLY docker-compose.yml — never the deploy overlay (which
# would pull in cloudflared and surface the local instance to the public tunnel).
# Prefer docker compose v2 plugin if available, fall back to legacy v1 binary.
# Auto-include docker-compose.override.yml when present (this is the standard
# compose convention but only kicks in automatically when -f is unspecified;
# we pass -f so we have to opt in by hand).
COMPOSE_FILES=(-f docker-compose.yml)
if [ -f docker-compose.override.yml ]; then
  COMPOSE_FILES+=(-f docker-compose.override.yml)
fi
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose --project-name "$PROJECT_NAME" "${COMPOSE_FILES[@]}")
else
  COMPOSE=(docker-compose --project-name "$PROJECT_NAME" "${COMPOSE_FILES[@]}")
fi

case "$action" in
  up)
    WEB_PORT="$WEB_PORT" "${COMPOSE[@]}" up -d --build "$@"
    ;;
  down)
    "${COMPOSE[@]}" down "$@"
    ;;
  ps)
    "${COMPOSE[@]}" ps "$@"
    ;;
  *)
    echo "Unknown action: $action" >&2
    exit 1
    ;;
esac
