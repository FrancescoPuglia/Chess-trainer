#!/bin/bash

# ♔ CHESS TRAINER ENTERPRISE - DEPLOYMENT SCRIPT
# Automated deployment with comprehensive checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/chess-trainer-deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Default values
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false
FORCE=false
BACKUP=true
ROLLBACK=false

# Help function
show_help() {
    cat << EOF
♔ Chess Trainer Enterprise Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Target environment (development|staging|production) [default: production]
    -t, --skip-tests         Skip running tests before deployment
    -b, --skip-build         Skip building the application
    -d, --dry-run           Show what would be done without executing
    -f, --force             Force deployment without confirmation
    --no-backup             Skip creating backup before deployment
    --rollback VERSION      Rollback to specified version
    -h, --help              Show this help message

EXAMPLES:
    $0                                      # Deploy to production with all checks
    $0 -e staging --skip-tests              # Deploy to staging without tests
    $0 --dry-run                           # Show deployment plan
    $0 --rollback v1.2.3                  # Rollback to version 1.2.3

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --no-backup)
            BACKUP=false
            shift
            ;;
        --rollback)
            ROLLBACK=true
            ROLLBACK_VERSION="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be development, staging, or production."
fi

# Pre-deployment checks
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check required tools
    local tools=("docker" "docker-compose" "git" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed."
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running."
    fi
    
    # Check Git status
    if [[ -n "$(git status --porcelain)" ]] && [[ "$FORCE" != true ]]; then
        error "Working directory is not clean. Commit or stash changes, or use --force."
    fi
    
    # Check environment file
    local env_file="$PROJECT_DIR/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi
    
    success "✅ Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warning "⚠️  Skipping tests as requested"
        return 0
    fi
    
    log "🧪 Running tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run: npm run test:run"
        return 0
    fi
    
    cd "$PROJECT_DIR"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "📦 Installing dependencies..."
        npm ci --silent
    fi
    
    # Run tests with timeout
    timeout 600 npm run test:run || error "Tests failed"
    
    # Run linting
    npm run lint || error "Linting failed"
    
    # Run type checking
    npm run type-check || error "Type checking failed"
    
    success "✅ All tests passed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == true ]]; then
        warning "⚠️  Skipping build as requested"
        return 0
    fi
    
    log "🏗️  Building application for $ENVIRONMENT..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run: npm run build"
        return 0
    fi
    
    cd "$PROJECT_DIR"
    
    # Set environment variables
    export NODE_ENV="$ENVIRONMENT"
    export VITE_BUILD_ANALYZE=false
    
    # Build application
    npm run build || error "Build failed"
    
    # Verify build output
    if [[ ! -d "dist" ]] || [[ ! -f "dist/index.html" ]]; then
        error "Build output is invalid"
    fi
    
    # Check bundle sizes
    local main_js_size=$(find dist/assets -name "*.js" -exec ls -la {} \; | awk '{sum += $5} END {print sum}')
    local main_css_size=$(find dist/assets -name "*.css" -exec ls -la {} \; | awk '{sum += $5} END {print sum}')
    
    log "Bundle sizes: JS=${main_js_size} bytes, CSS=${main_css_size} bytes"
    
    # Warn if bundles are too large
    if (( main_js_size > 1048576 )); then # 1MB
        warning "JavaScript bundle is larger than 1MB"
    fi
    
    success "✅ Build completed successfully"
}

# Create backup
create_backup() {
    if [[ "$BACKUP" != true ]] || [[ "$ROLLBACK" == true ]]; then
        return 0
    fi
    
    log "💾 Creating backup..."
    
    local backup_dir="$PROJECT_DIR/backups/$(date +%Y%m%d-%H%M%S)"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would create backup at $backup_dir"
        return 0
    fi
    
    mkdir -p "$backup_dir"
    
    # Backup current Docker images
    if docker images | grep -q "chess-trainer"; then
        docker save chess-trainer:latest | gzip > "$backup_dir/chess-trainer-image.tar.gz"
    fi
    
    # Backup configuration files
    cp -r "$PROJECT_DIR"/{docker-compose.yml,.env.*,nginx*.conf} "$backup_dir/" 2>/dev/null || true
    
    # Create backup manifest
    cat > "$backup_dir/manifest.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "environment": "$ENVIRONMENT",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "backup_type": "pre-deployment"
}
EOF
    
    success "✅ Backup created at $backup_dir"
}

# Deploy application
deploy_application() {
    log "🚀 Deploying to $ENVIRONMENT environment..."
    
    cd "$PROJECT_DIR"
    
    local compose_file="docker-compose.yml"
    local compose_override=""
    
    # Select compose file based on environment
    case "$ENVIRONMENT" in
        development)
            compose_file="docker-compose.dev.yml"
            ;;
        staging)
            compose_override="-f docker-compose.yml -f docker-compose.staging.yml"
            ;;
        production)
            compose_override="-f docker-compose.yml -f docker-compose.prod.yml"
            ;;
    esac
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run: docker-compose $compose_override up -d --build"
        return 0
    fi
    
    # Build and start services
    if [[ -n "$compose_override" ]]; then
        docker-compose $compose_override build --no-cache
        docker-compose $compose_override up -d
    else
        docker-compose -f "$compose_file" build --no-cache
        docker-compose -f "$compose_file" up -d
    fi
    
    # Wait for services to be healthy
    log "⏳ Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose $compose_override ps | grep -q "Up (healthy)"; then
            break
        fi
        
        ((attempt++))
        sleep 10
        log "Attempt $attempt/$max_attempts - waiting for services..."
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        error "Services failed to become healthy within timeout"
    fi
    
    success "✅ Deployment completed successfully"
}

# Health checks
run_health_checks() {
    log "🏥 Running health checks..."
    
    local base_url="http://localhost"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        base_url="https://chesstrainer.com"
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run health checks against $base_url"
        return 0
    fi
    
    # Check main application
    local max_attempts=10
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -sf "$base_url/health" > /dev/null; then
            break
        fi
        
        ((attempt++))
        sleep 5
        log "Health check attempt $attempt/$max_attempts..."
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        error "Health checks failed"
    fi
    
    # Test critical endpoints
    local endpoints=("/health" "/manifest.json")
    for endpoint in "${endpoints[@]}"; do
        if ! curl -sf "$base_url$endpoint" > /dev/null; then
            warning "Endpoint $endpoint is not responding correctly"
        fi
    done
    
    success "✅ Health checks passed"
}

# Rollback functionality
rollback_deployment() {
    if [[ "$ROLLBACK" != true ]]; then
        return 0
    fi
    
    log "🔄 Rolling back to version $ROLLBACK_VERSION..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would rollback to $ROLLBACK_VERSION"
        return 0
    fi
    
    # Find backup directory
    local backup_dir="$PROJECT_DIR/backups/$ROLLBACK_VERSION"
    if [[ ! -d "$backup_dir" ]]; then
        error "Backup directory not found: $backup_dir"
    fi
    
    # Restore Docker image
    if [[ -f "$backup_dir/chess-trainer-image.tar.gz" ]]; then
        docker load < "$backup_dir/chess-trainer-image.tar.gz"
    fi
    
    # Restart services
    docker-compose down
    docker-compose up -d
    
    success "✅ Rollback completed"
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    
    # Remove old Docker images
    docker image prune -f --filter "until=72h" || true
    
    # Remove old backups (keep last 10)
    if [[ -d "$PROJECT_DIR/backups" ]]; then
        cd "$PROJECT_DIR/backups"
        ls -1t | tail -n +11 | xargs -r rm -rf
    fi
    
    success "✅ Cleanup completed"
}

# Main deployment flow
main() {
    log "🚀 Starting Chess Trainer Enterprise deployment"
    log "Environment: $ENVIRONMENT"
    log "Log file: $LOG_FILE"
    
    if [[ "$DRY_RUN" == true ]]; then
        warning "🔍 DRY RUN MODE - No changes will be made"
    fi
    
    # Confirmation prompt
    if [[ "$FORCE" != true ]] && [[ "$DRY_RUN" != true ]]; then
        read -p "Deploy to $ENVIRONMENT? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Execute deployment steps
    check_prerequisites
    
    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
    else
        run_tests
        build_application
        create_backup
        deploy_application
    fi
    
    run_health_checks
    cleanup
    
    success "🎉 Deployment completed successfully!"
    log "📋 Log file saved to: $LOG_FILE"
    
    # Show deployment summary
    cat << EOF

♔ DEPLOYMENT SUMMARY
────────────────────────────────────────
Environment:    $ENVIRONMENT
Timestamp:      $(date)
Git Commit:     $(git rev-parse --short HEAD)
Git Branch:     $(git rev-parse --abbrev-ref HEAD)
Log File:       $LOG_FILE

EOF
}

# Trap signals for cleanup
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"