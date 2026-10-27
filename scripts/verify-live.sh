#!/usr/bin/env bash
# Quick live-site verification. Run after any Cloudflare dashboard change
# (hostname route, tunnel rebinding, SSL toggle) to confirm benjaminlevin.com
# is back up and serving the same content the local Docker container has.
#
# Usage:
#   ./scripts/verify-live.sh
#   ./scripts/verify-live.sh --detail   # also dumps headers + cloudflared log tail

set -u
DOMAIN="${DOMAIN:-https://benjaminlevin.com}"
LOCAL="${LOCAL:-http://localhost:3003}"
DETAIL=0
[[ "${1:-}" == "--detail" ]] && DETAIL=1

CURL=/usr/bin/curl

# Color helpers
GREEN=$'\033[32m'
RED=$'\033[31m'
DIM=$'\033[2m'
RESET=$'\033[0m'

probe() {
  local label="$1" url="$2"
  local code
  code=$($CURL -sIL -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    printf "  ${GREEN}✓${RESET} %-50s ${DIM}%s${RESET}\n" "$label" "$code"
  else
    printf "  ${RED}✗${RESET} %-50s ${DIM}%s${RESET}\n" "$label" "$code"
  fi
}

echo ""
echo "─── Local origin (must be green for live to work) ─────────────"
probe "$LOCAL/"                            "$LOCAL/"
probe "$LOCAL/api/chat/health"             "$LOCAL/api/chat/health"

echo ""
echo "─── Public site ($DOMAIN) ──────────────────────────"
probe "$DOMAIN/"                                       "$DOMAIN/"
probe "$DOMAIN/api/chat/health"                        "$DOMAIN/api/chat/health"
probe "$DOMAIN/experience/prsm-ai"                     "$DOMAIN/experience/prsm-ai"
probe "$DOMAIN/experience/tesla"                       "$DOMAIN/experience/tesla"
probe "$DOMAIN/experience/formulatrix"                 "$DOMAIN/experience/formulatrix"
probe "$DOMAIN/project/tetris-bot"                     "$DOMAIN/project/tetris-bot"
probe "$DOMAIN/project/ornithopter"                    "$DOMAIN/project/ornithopter"
probe "$DOMAIN/project/en-passant"                     "$DOMAIN/project/en-passant"
probe "$DOMAIN/project/ai-assistant"                   "$DOMAIN/project/ai-assistant"
probe "$DOMAIN/project/trading-algo"                   "$DOMAIN/project/trading-algo"

echo ""
echo "─── Media (sample) ────────────────────────────────────────────"
probe "prsm-fsm.mp4"          "$DOMAIN/media/projects/prsm-ai/prsm-fsm.mp4"
probe "tetris-training.mp4"   "$DOMAIN/media/projects/tetris-bot/tetris-training.mp4"
probe "tesla hand photo"      "$DOMAIN/media/experiences/tesla/hand-tactile-egg-demo.jpg"
probe "headshot"              "$DOMAIN/media/profile/headshot.jpg"

echo ""
echo "─── HTTP → HTTPS redirect ─────────────────────────────────────"
redirect=$($CURL -sI -o /dev/null -w "%{http_code} %{redirect_url}" --max-time 15 "http://${DOMAIN#https://}/" 2>/dev/null || echo "fail")
echo "  $redirect"

echo ""
echo "─── Cloudflared process ───────────────────────────────────────"
if pgrep -fq cloudflared; then
  pid=$(pgrep -f "cloudflared tunnel run" | head -1)
  etime=$(ps -p "$pid" -o etime= 2>/dev/null | awk '{$1=$1; print}')
  echo "  ${GREEN}✓${RESET} running  pid=$pid  uptime=$etime"
else
  echo "  ${RED}✗${RESET} no cloudflared process"
fi

if [[ $DETAIL -eq 1 ]]; then
  echo ""
  echo "─── Public response headers (/) ───────────────────────────────"
  $CURL -sI --max-time 15 "$DOMAIN/" | head -20

  echo ""
  echo "─── Cloudflared error log (last 20 lines, may need sudo) ──────"
  if [[ -r /Library/Logs/com.cloudflare.cloudflared.err.log ]]; then
    tail -20 /Library/Logs/com.cloudflare.cloudflared.err.log
  else
    echo "  log not readable as $(whoami) — try: sudo tail -20 /Library/Logs/com.cloudflare.cloudflared.err.log"
  fi

  echo ""
  echo "─── Chatbot end-to-end test ──────────────────────────────────"
  $CURL -s -N -X POST "$DOMAIN/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"In 1 sentence, name the most technically interesting thing Ben built.","sessionId":"verify-live-smoke"}' \
    --max-time 90
  echo ""
fi

echo ""
