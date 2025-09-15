# ♔ Chess Trainer Enterprise - Deployment Guide

## 📋 Overview

This document provides comprehensive deployment instructions for the Chess Trainer Enterprise application, covering local development, staging, and production environments with enterprise-grade configurations.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Internet  →  Traefik (SSL/TLS)  →  Nginx  →  React App    │
│                     ↓                                       │
│               Load Balancer                                 │
│                     ↓                                       │
│              Redis (Caching)                               │
│                     ↓                                       │
│          Monitoring Stack (Prometheus/Grafana)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Prerequisites

### System Requirements
- **Node.js**: 20.x LTS
- **Docker**: 24.x or later
- **Docker Compose**: 2.x or later
- **Git**: 2.x or later
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 10GB free space

### Required Accounts & Services
- GitHub account (for CI/CD)
- Container registry access (GHCR/Docker Hub)
- SSL certificate provider (Let's Encrypt recommended)
- Domain name configured with DNS

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/chess-trainer-enterprise.git
cd chess-trainer-enterprise
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Run quality checks
npm run quality:check
```

### 3. Development Environment
```bash
# Start development server
npm run dev

# Or with Docker
npm run docker:dev
```

### 4. Production Build
```bash
# Build for production
npm run build:production

# Analyze bundle
npm run build:analyze
```

## 🌍 Environment Configurations

### Development Environment
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Available services:
# - Application: http://localhost:3000
# - API: http://localhost:8080
# - Database: localhost:5432
# - Redis: localhost:6379
# - MailCatcher: http://localhost:1080
# - MinIO: http://localhost:9001
```

### Staging Environment
```bash
# Deploy to staging
npm run deploy:staging

# Or with manual deployment
./scripts/deploy.sh --environment staging
```

### Production Environment
```bash
# Deploy to production
npm run deploy:production

# Or with manual deployment
./scripts/deploy.sh --environment production --force
```

## 🐳 Docker Deployment

### Single Container Deployment
```bash
# Build and run single container
docker build -t chess-trainer .
docker run -p 80:80 chess-trainer
```

### Multi-Service Deployment
```bash
# Production deployment with all services
docker-compose up -d

# View services status
docker-compose ps

# View logs
docker-compose logs -f chess-trainer
```

### Service Health Checks
```bash
# Check application health
curl http://localhost/health

# Check all services
docker-compose exec chess-trainer curl -f http://localhost:80/health
```

## 🔧 Configuration Management

### Environment Variables

#### Application Configuration
```bash
# Core settings
VITE_APP_NAME="Chess Trainer Enterprise"
VITE_APP_VERSION="1.0.0"
VITE_BASE_URL="/"

# API Configuration
VITE_API_BASE_URL="https://api.chesstrainer.com"
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_FEATURE_VIDEO_ANALYSIS=true
VITE_FEATURE_ADVANCED_ANALYTICS=true
VITE_FEATURE_MULTIPLAYER=false
```

#### Performance Configuration
```bash
# Stockfish Engine
VITE_STOCKFISH_DEPTH=15
VITE_STOCKFISH_THREADS=2
VITE_STOCKFISH_HASH_SIZE=256

# Performance Budgets
VITE_PERF_BUDGET_JS="1MB"
VITE_PERF_BUDGET_CSS="200KB"
VITE_PERF_BUDGET_IMAGES="2MB"
```

#### Security Configuration
```bash
# Security Headers
VITE_CSP_ENABLED=true
VITE_SECURE_HEADERS=true
VITE_CORS_ORIGINS="https://chesstrainer.com"

# PWA Settings
VITE_PWA_ENABLED=true
VITE_PWA_CACHE_STRATEGY="CacheFirst"
```

### Nginx Configuration

The application includes optimized Nginx configurations:

- **Production**: `nginx-default.conf` - Full security headers, caching, compression
- **Development**: `nginx-dev.conf` - Development-friendly settings
- **Core**: `nginx.conf` - Base Nginx configuration with performance optimizations

### SSL/TLS Configuration

Production deployments use Traefik for automatic SSL certificate management:

```yaml
# Automatic Let's Encrypt certificates
- --certificatesresolvers.letsencrypt.acme.tlschallenge=true
- --certificatesresolvers.letsencrypt.acme.email=admin@chesstrainer.com
```

## 📊 Monitoring & Observability

### Included Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Promtail**: Log collection
- **Node Exporter**: System metrics

### Access Monitoring Services
```bash
# Grafana Dashboard
open http://localhost:3001
# Default login: admin/admin123

# Prometheus Metrics
open http://localhost:9090

# Traefik Dashboard
open http://localhost:8080
```

### Key Metrics Monitored
- Application performance (response times, throughput)
- Chess engine performance (analysis time, accuracy)
- Video synchronization accuracy
- Database query performance
- Memory and CPU usage
- User engagement metrics

## 🚨 Health Checks & Alerts

### Built-in Health Checks
```bash
# Application health
curl http://localhost/health

# Service-specific health checks
curl http://localhost/api/health
curl http://localhost:6379/ping  # Redis
```

### Performance Budgets
The application enforces strict performance budgets:

- **First Contentful Paint**: < 2 seconds
- **Largest Contentful Paint**: < 3 seconds
- **Cumulative Layout Shift**: < 0.1
- **Total Blocking Time**: < 300ms
- **JavaScript Bundle**: < 1MB
- **CSS Bundle**: < 200KB
- **Total Page Weight**: < 3MB

### Automated Alerts
Configure alerts for:
- High response times (> 2 seconds)
- High error rates (> 1%)
- Memory usage (> 80%)
- Disk usage (> 85%)
- SSL certificate expiration

## 🔐 Security Best Practices

### Implemented Security Measures
- **Content Security Policy (CSP)**: Strict policy preventing XSS
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options
- **Rate Limiting**: Protection against DDoS and abuse
- **Container Security**: Non-root user, minimal attack surface
- **Vulnerability Scanning**: Automated scanning in CI/CD pipeline

### Security Checklist
- [ ] Environment variables properly configured
- [ ] SSL certificates valid and auto-renewing
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Vulnerability scanning enabled
- [ ] Container images regularly updated
- [ ] Secrets properly managed
- [ ] Access logs monitored

## 🧪 Testing & Quality Assurance

### Automated Testing Pipeline
```bash
# Run all tests
npm run quality:check

# Individual test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Performance testing
npm run performance:test

# Security audit
npm run security:audit
```

### Pre-deployment Checks
The deployment script automatically runs:
1. Code quality checks (linting, formatting)
2. Type checking
3. Unit and integration tests
4. Security vulnerability scan
5. Performance budget validation
6. Docker image security scan

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
The CI/CD pipeline includes:

1. **Quality Gate**: Code quality, linting, type checking
2. **Test Suite**: Unit, integration, and E2E tests
3. **Performance Testing**: Lighthouse CI with budgets
4. **Security Scanning**: Vulnerability and container scanning
5. **Docker Build**: Multi-platform image build
6. **Deployment**: Automated deployment to staging/production
7. **Monitoring**: Post-deployment health checks

### Deployment Triggers
- **Development**: Push to `develop` branch → Deploy to staging
- **Production**: GitHub release → Deploy to production
- **Manual**: Workflow dispatch for emergency deployments

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
npm run clean:full
npm install
npm run build
```

#### Container Issues
```bash
# Check container logs
docker-compose logs chess-trainer

# Restart services
docker-compose restart

# Rebuild containers
docker-compose build --no-cache
```

#### Performance Issues
```bash
# Analyze bundle size
npm run bundle:analyze

# Check runtime performance
npm run performance:test

# Monitor resource usage
docker stats
```

#### SSL/TLS Issues
```bash
# Check certificate status
openssl s_client -connect chesstrainer.com:443 -servername chesstrainer.com

# Renew certificates
docker-compose exec traefik traefik version
```

### Debugging Tools
- **Application Logs**: Available in Grafana Loki
- **Performance Metrics**: Lighthouse CI reports
- **Container Logs**: `docker-compose logs`
- **Health Endpoints**: `/health`, `/metrics`

### Support Resources
- **Documentation**: This file and inline code documentation
- **Monitoring**: Grafana dashboards for real-time insights
- **Logs**: Centralized logging in Loki
- **Metrics**: Prometheus metrics for troubleshooting

## 📞 Emergency Procedures

### Rollback Deployment
```bash
# Quick rollback to previous version
./scripts/deploy.sh --rollback v1.2.3

# Or manual rollback
docker-compose down
docker tag chess-trainer:v1.2.3 chess-trainer:latest
docker-compose up -d
```

### Scale Services
```bash
# Scale application instances
docker-compose up -d --scale chess-trainer=3

# Check scaling status
docker-compose ps
```

### Emergency Contacts
- **Technical Lead**: [Your contact information]
- **DevOps Team**: [DevOps contact information]  
- **On-call Engineer**: [On-call contact information]

## 📈 Performance Optimization

### Bundle Optimization
- Intelligent code splitting by feature modules
- Vendor chunk optimization for better caching
- Dynamic imports for non-critical features
- Service worker for offline functionality

### Caching Strategy
- Static assets: 1 year cache with immutable headers
- API responses: Redis caching with intelligent invalidation
- Service worker: Cache-first strategy for static content
- CDN integration ready for global distribution

### Database Optimization
- Advanced indexing strategies
- Query optimization with performance monitoring
- Connection pooling and reuse
- Automated performance analysis

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial enterprise deployment configuration |

---

**♔ Chess Trainer Enterprise** - Built with enterprise-grade quality and security in mind.