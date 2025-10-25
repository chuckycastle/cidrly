# cidrly Deployment Guide

This guide covers deployment options for cidrly in production environments.

## Table of Contents

- [NPM Package Installation](#npm-package-installation)
- [Docker Deployment](#docker-deployment)
- [Standalone Binary](#standalone-binary)
- [Production Best Practices](#production-best-practices)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

---

## NPM Package Installation

### Global Installation

Install cidrly globally for system-wide access:

```bash
npm install -g cidrly

# Verify installation
cidrly --version

# Launch dashboard
cidrly
```

### Project-Local Installation

Install as a development tool in your project:

```bash
npm install --save-dev cidrly

# Run via npx
npx cidrly

# Or add to package.json scripts
{
  "scripts": {
    "network-plan": "cidrly"
  }
}
```

### Version Pinning

For reproducible deployments, pin to a specific version:

```json
{
  "dependencies": {
    "cidrly": "1.0.0-rc.1"
  }
}
```

---

## Docker Deployment

### Quick Start

```bash
# Build image
docker compose build

# Run interactive dashboard
docker compose up

# Run with detached mode
docker compose up -d

# Execute commands
docker compose exec cidrly node dist/cli.js --help
```

### Custom Docker Build

```bash
# Build image with custom tag
docker build -t cidrly:custom .

# Run container
docker run -it --rm cidrly:custom

# Run specific command
docker run --rm cidrly:custom node dist/cli.js view --plan=/app/saved-plans/network.json
```

### Production Docker Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  cidrly:
    image: cidrly:1.0.0-rc.1
    container_name: cidrly-prod

    environment:
      - NODE_ENV=production
      - TZ=UTC

    volumes:
      - ./data/saved-plans:/app/saved-plans:rw

    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

    restart: unless-stopped

    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### Kubernetes Deployment

```yaml
# cidrly-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cidrly
  namespace: network-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cidrly
  template:
    metadata:
      labels:
        app: cidrly
    spec:
      containers:
        - name: cidrly
          image: cidrly:1.0.0-rc.1
          imagePullPolicy: IfNotPresent

          resources:
            requests:
              memory: '128Mi'
              cpu: '250m'
            limits:
              memory: '256Mi'
              cpu: '500m'

          volumeMounts:
            - name: saved-plans
              mountPath: /app/saved-plans

          env:
            - name: NODE_ENV
              value: 'production'

      volumes:
        - name: saved-plans
          persistentVolumeClaim:
            claimName: cidrly-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cidrly-pvc
  namespace: network-tools
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

---

## Standalone Binary

### Building from Source

```bash
# Clone repository
git clone https://github.com/yourusername/cidrly.git
cd cidrly

# Install dependencies
npm ci

# Build production bundle
npm run build:prod

# Test build
node dist/cli.js --version

# Package for distribution
npm pack
```

### System-Wide Installation from Source

```bash
# Build and link globally
npm run build:prod
npm link

# Verify
which cidrly
cidrly --version

# Unlink when done
npm unlink -g cidrly
```

---

## Production Best Practices

### 1. Security

- **Run as non-root user** in containers
- **Use read-only file systems** where possible
- **Scan for vulnerabilities** regularly
  ```bash
  npm audit
  npm run security
  ```
- **Keep dependencies updated**
  ```bash
  npm outdated
  npm update
  ```

### 2. Performance

- **Use production build** (no source maps, minified)
  ```bash
  npm run build:prod
  ```
- **Prune development dependencies**
  ```bash
  npm ci --omit=dev
  ```
- **Enable Node.js performance options**
  ```bash
  NODE_ENV=production node --max-old-space-size=256 dist/cli.js
  ```

### 3. Reliability

- **Health checks** for containerized deployments
- **Restart policies** for long-running processes
- **Resource limits** to prevent memory leaks
- **Graceful shutdown** handling

### 4. Data Persistence

- **Volume mounts** for saved plans
  ```bash
  docker run -v ./data:/app/saved-plans cidrly:latest
  ```
- **Backup strategies** for critical network plans
- **Version control** for plan files

---

## Environment Configuration

### Environment Variables

```bash
# Production mode
export NODE_ENV=production

# Timezone
export TZ=UTC

# Custom saved plans directory
export CIDRLY_PLANS_DIR=/var/lib/cidrly/plans

# Logging level (if implemented)
export LOG_LEVEL=info
```

### Configuration Files

Create `.cidrlyrc.json` in your home directory:

```json
{
  "defaultPlansDirectory": "~/network-plans",
  "defaultBaseIP": "10.0.0.0",
  "theme": "default"
}
```

---

## Monitoring & Logging

### Docker Logs

```bash
# View logs
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100

# Export logs
docker compose logs > cidrly-logs.txt
```

### Health Checks

```bash
# Check container health
docker compose ps

# Manual health check
docker compose exec cidrly node -e "console.log('healthy')"
```

### Metrics Collection

Integrate with your monitoring stack:

```bash
# Prometheus metrics (if implemented)
curl http://localhost:9090/metrics

# Custom health endpoint
curl http://localhost:3000/health
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors

**Problem:** Cannot write to saved-plans directory

**Solution:**

```bash
# Fix directory permissions
chmod 755 saved-plans
chown -R 1001:1001 saved-plans

# Docker: run as correct user
docker run --user 1001:1001 cidrly:latest
```

#### 2. Module Not Found

**Problem:** Missing dependencies after deployment

**Solution:**

```bash
# Rebuild node_modules
rm -rf node_modules package-lock.json
npm install

# Or use clean install
npm ci
```

#### 3. Terminal Display Issues

**Problem:** Dashboard not rendering correctly

**Solution:**

```bash
# Check terminal compatibility
echo $TERM

# Set compatible terminal
export TERM=xterm-256color

# Run in interactive mode
docker run -it cidrly:latest
```

#### 4. Build Failures

**Problem:** TypeScript compilation errors

**Solution:**

```bash
# Clean build artifacts
npm run clean

# Rebuild
npm run build:prod

# Check TypeScript version
npx tsc --version
```

### Debug Mode

Run with debug logging:

```bash
# Enable verbose output
NODE_ENV=development npm run dev

# TypeScript compilation debug
npm run build -- --listFiles

# Test with coverage
npm run test:coverage
```

### Getting Help

1. **Check logs** first: `docker compose logs` or `npm run build`
2. **Review documentation**: README.md, ARCHITECTURE.md
3. **Run tests**: `npm test`
4. **Check issues**: GitHub Issues
5. **Security scan**: `npm run security`

---

## Deployment Checklist

Before deploying to production:

- [ ] Run all tests: `npm test`
- [ ] Run security scan: `npm run security`
- [ ] Build production bundle: `npm run build:prod`
- [ ] Verify build artifacts exist in `dist/`
- [ ] Test CLI commands work: `node dist/cli.js --help`
- [ ] Test dashboard launches: `node dist/cli.js`
- [ ] Review and update CHANGELOG.md
- [ ] Tag release: `git tag v1.0.0`
- [ ] Build Docker image: `docker compose build`
- [ ] Test Docker deployment: `docker compose up`
- [ ] Set up monitoring and logging
- [ ] Configure backups for saved plans
- [ ] Document custom configuration
- [ ] Set up CI/CD pipeline

---

## Rollback Procedure

If issues arise in production:

```bash
# Docker: revert to previous image
docker tag cidrly:latest cidrly:rollback
docker pull cidrly:v0.9.0
docker tag cidrly:v0.9.0 cidrly:latest
docker compose up -d

# NPM: install previous version
npm install -g cidrly@0.9.0

# From source: checkout previous tag
git checkout v0.9.0
npm run build:prod
```

---

## Performance Benchmarks

Expected performance metrics:

- **Startup time**: < 2 seconds
- **Memory usage**: 64-128 MB (typical)
- **Build time**: 5-10 seconds
- **Test execution**: 10-15 seconds
- **Docker image size**: ~200 MB

---

## Support & Resources

- **Documentation**: See README.md and ARCHITECTURE.md
- **Issues**: GitHub Issues
- **Security**: Report to security@example.com
- **Updates**: Check CHANGELOG.md for version history

---

**Last Updated:** 2024-10-24
**Version:** 1.0.0-rc.1
