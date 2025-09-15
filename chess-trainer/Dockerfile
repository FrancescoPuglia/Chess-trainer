# ♔ ENTERPRISE CHESS TRAINER DOCKERFILE
# Multi-stage build for optimal production deployment

# =============================================
# Stage 1: Dependencies and Build Environment
# =============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies with production optimizations
RUN npm ci --only=production --silent \
    && npm cache clean --force

# Copy source code
COPY . .

# Build application with production optimizations
ENV NODE_ENV=production
ENV VITE_BUILD_ANALYZE=false
ENV VITE_BUILD_SOURCE_MAPS=false

RUN npm run build

# =============================================
# Stage 2: Production Web Server
# =============================================
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk upgrade --no-cache \
    && apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/cache/nginx/client_temp \
    && chown -R nextjs:nodejs /var/log/nginx /var/cache/nginx \
    && chmod -R 755 /var/log/nginx /var/cache/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Set security labels
LABEL maintainer="Chess Trainer Enterprise Team" \
      version="1.0.0" \
      description="Enterprise chess training platform" \
      org.opencontainers.image.source="https://github.com/chess-trainer/enterprise" \
      org.opencontainers.image.vendor="Chess Trainer Enterprise" \
      org.opencontainers.image.version="1.0.0"

# Switch to non-root user
USER nextjs

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================
# Stage 3: Development Environment (Optional)
# =============================================
FROM node:20-alpine AS development

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci --silent

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# =============================================
# Stage 4: Testing Environment
# =============================================
FROM node:20-alpine AS testing

WORKDIR /app

# Install testing dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    chromium \
    firefox

# Set environment variables for headless testing
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV FIREFOX_BIN=/usr/bin/firefox

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Run tests
CMD ["npm", "run", "test:run"]