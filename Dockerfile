# ── Stage 1: Build frontend ──────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production runtime ─────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

# Install only production dependencies + native build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server source (tsx runs TS directly)
COPY server/ ./server/
COPY .env.example ./.env.example

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Install tsx for running TypeScript server
RUN npm install tsx

# Create data directory for SQLite
RUN mkdir -p /app/data

# Add non-root user
RUN groupadd -r driveledger && useradd -r -g driveledger -d /app driveledger
RUN chown -R driveledger:driveledger /app
USER driveledger

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "server/index.ts"]
