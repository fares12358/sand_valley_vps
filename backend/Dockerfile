# API image. Build from the repository root (npm workspaces share one lockfile):
#   docker build -f backend/Dockerfile -t sandvalley-api .

# ---- production dependencies only ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN npm ci --omit=dev -w backend

# ---- runtime ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json backend/
COPY backend/src backend/src
COPY backend/scripts backend/scripts

# Uploaded images live on a volume mounted here; the node user must own it.
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node

EXPOSE 5000
VOLUME ["/data/uploads"]

# GET / answers with a hello string without touching the database
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "backend/src/server.js"]
