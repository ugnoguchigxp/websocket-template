# Multi-stage build for frontend application

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy application files
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY apps/api ./apps/api

# Build the application
WORKDIR /app/apps/web
RUN pnpm build

# Stage 2: Production stage
FROM nginx:1.27-alpine

# Copy built assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create nginx configuration for SPA with SSL support
RUN echo 'server { \
    listen 80; \
    listen 443 ssl; \
    \
    ssl_certificate /etc/nginx/ssl/server.crt; \
    ssl_certificate_key /etc/nginx/ssl/server.key; \
    ssl_protocols TLSv1.2 TLSv1.3; \
    ssl_ciphers HIGH:!aNULL:!MD5; \
    ssl_prefer_server_ciphers on; \
    \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Security headers \
    add_header X-Frame-Options "DENY" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript; \
}' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
