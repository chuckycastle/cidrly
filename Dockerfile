# Multi-stage build for production-optimized cidrly CLI tool
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json tsconfig.prod.json ./
COPY src/ ./src/

# Build the application with production config
RUN npm run build:prod

# Production stage
FROM node:18-alpine AS production

# Add metadata
LABEL maintainer="cidrly"
LABEL description="Network architecture and design planning CLI tool"
LABEL version="1.0.0-rc.1"

# Create non-root user for security
RUN addgroup -g 1001 -S cidrly && \
    adduser -S -u 1001 -G cidrly cidrly

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy essential files
COPY README.md ./

# Create directory for saved plans
RUN mkdir -p /app/saved-plans && \
    chown -R cidrly:cidrly /app

# Switch to non-root user
USER cidrly

# Set environment variables
ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Default command - launch interactive dashboard
ENTRYPOINT ["node", "dist/cli.js"]
CMD []
