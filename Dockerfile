# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_AUTH_GUARD_ENABLED=true
ARG VITE_REDIRECT_ON_401=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_GUARD_ENABLED=$VITE_AUTH_GUARD_ENABLED \
    VITE_REDIRECT_ON_401=$VITE_REDIRECT_ON_401

RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
