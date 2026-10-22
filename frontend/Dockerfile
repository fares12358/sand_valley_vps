# Dashboard image: Vite build served by nginx, which also proxies the API. Build from the repository root:
#   docker build -f frontend/Dockerfile -t sandvalley-web .

# ---- build the static site ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w frontend
COPY frontend frontend
# Backend address baked into the build (VITE_API_URL in the root .env, e.g. https://api.example.com, no trailing slash).
# Empty = same origin: the browser calls /api/... on the host that served the page.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w frontend

# ---- serve it ----
FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
