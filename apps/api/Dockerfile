# Multi-stage build for backend API

# Stage 1: Dependencies stage
FROM node:20-alpine AS deps

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ sqlite-dev

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy application package files
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy API source code
COPY apps/api ./apps/api

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm db:generate

# Build the application
RUN pnpm build

# Stage 3: Production stage
FROM node:20-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache sqlite-libs openssl wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy necessary files from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

# Create directories for data and SSL
RUN mkdir -p /app/data /app/ssl && \
    chown -R nodejs:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
