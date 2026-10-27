FROM node:22-bookworm-slim AS deps

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000 \
  HOME=/home/node \
  NEXT_PUBLIC_ENABLE_CHATBOT=true \
  NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl gosu ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @openai/codex@0.148.0

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder /app/node_modules/prebuild-install ./node_modules/prebuild-install
COPY --from=builder /app/node_modules/node-abi ./node_modules/node-abi
COPY --from=builder /app/BEN_CONTEXT.md ./BEN_CONTEXT.md
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/init-db.js /app/init-db.js
COPY docker/codex-chatbot-profile.toml /etc/blevin/codex-chatbot-profile.toml

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/data /tmp/blevin_chat_sessions /home/node/.codex \
  && chown -R node:node /app /tmp/blevin_chat_sessions /home/node/.codex

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://127.0.0.1:${PORT:-3000}/ >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
