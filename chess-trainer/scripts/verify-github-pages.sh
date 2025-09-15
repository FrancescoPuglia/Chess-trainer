#!/bin/bash

# ♔ GITHUB PAGES VERIFICATION SCRIPT
# Comprehensive verification of GitHub Pages deployment configuration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✅]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠️]${NC} $1"
}

error() {
    echo -e "${RED}[❌]${NC} $1"
}

check_vite_config() {
    log "Checking Vite configuration..."
    
    local vite_config="$PROJECT_DIR/vite.config.ts"
    
    if [[ ! -f "$vite_config" ]]; then
        error "vite.config.ts not found"
        return 1
    fi
    
    # Check for GitHub Pages base URL configuration
    if grep -q "Chess-trainer" "$vite_config"; then
        success "GitHub Pages base URL configured correctly"
    else
        error "GitHub Pages base URL not found in vite.config.ts"
        return 1
    fi
    
    # Check for environment variable handling
    if grep -q "VITE_GITHUB_PAGES" "$vite_config"; then
        success "GitHub Pages environment detection configured"
    else
        warning "GitHub Pages environment detection not found"
    fi
}

check_github_workflow() {
    log "Checking GitHub Actions workflow..."
    
    local workflow_file="$PROJECT_DIR/.github/workflows/github-pages.yml"
    
    if [[ ! -f "$workflow_file" ]]; then
        error "GitHub Pages workflow not found"
        return 1
    fi
    
    success "GitHub Actions workflow exists"
    
    # Check workflow configuration
    if grep -q "actions/deploy-pages@v4" "$workflow_file"; then
        success "Using latest GitHub Pages deployment action"
    else
        warning "Consider updating to latest deployment action"
    fi
    
    if grep -q "working-directory: chess-trainer" "$workflow_file"; then
        success "Working directory correctly set to chess-trainer"
    else
        error "Working directory not configured correctly"
        return 1
    fi
}

check_package_scripts() {
    log "Checking package.json scripts..."
    
    local package_json="$PROJECT_DIR/package.json"
    
    if [[ ! -f "$package_json" ]]; then
        error "package.json not found"
        return 1
    fi
    
    if grep -q "build:github-pages" "$package_json"; then
        success "GitHub Pages build script exists"
    else
        warning "GitHub Pages build script not found"
    fi
}

check_environment_files() {
    log "Checking environment configuration..."
    
    local env_files=(
        ".env.example"
        ".env.development"
        ".env.production"
        ".env.github-pages"
    )
    
    for env_file in "${env_files[@]}"; do
        if [[ -f "$PROJECT_DIR/$env_file" ]]; then
            success "$env_file exists"
        else
            warning "$env_file not found"
        fi
    done
}

test_local_build() {
    log "Testing local GitHub Pages build..."
    
    cd "$PROJECT_DIR"
    
    # Set environment variables for GitHub Pages
    export VITE_GITHUB_PAGES=true
    export VITE_BASE_URL="/Chess-trainer/"
    export NODE_ENV=production
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        log "Installing dependencies..."
        npm ci --silent
    fi
    
    # Run build
    log "Running GitHub Pages build..."
    if npm run build:github-pages > /dev/null 2>&1; then
        success "GitHub Pages build completed successfully"
    else
        error "GitHub Pages build failed"
        return 1
    fi
    
    # Verify build output
    if [[ -f "dist/index.html" ]]; then
        success "index.html generated"
    else
        error "index.html not found in build output"
        return 1
    fi
    
    # Check for 404.html (needed for SPA routing)
    if [[ -f "dist/404.html" ]]; then
        success "404.html exists for SPA routing"
    else
        warning "404.html not found - SPA routing may not work correctly"
    fi
    
    # Check base URL in generated files
    if grep -q "/Chess-trainer/" "dist/index.html"; then
        success "Base URL correctly set in generated files"
    else
        error "Base URL not found in generated files"
        return 1
    fi
    
    # Check bundle sizes
    local js_size=$(find dist/assets -name "*.js" -exec ls -la {} \; 2>/dev/null | awk '{sum += $5} END {print sum}' || echo "0")
    local css_size=$(find dist/assets -name "*.css" -exec ls -la {} \; 2>/dev/null | awk '{sum += $5} END {print sum}' || echo "0")
    
    log "Bundle sizes:"
    log "  JavaScript: $((js_size / 1024))KB"
    log "  CSS: $((css_size / 1024))KB"
    
    if [[ $js_size -lt 1048576 ]]; then # 1MB
        success "JavaScript bundle size is acceptable"
    else
        warning "JavaScript bundle is larger than 1MB"
    fi
}

check_git_configuration() {
    log "Checking Git configuration..."
    
    cd "$PROJECT_DIR/.."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a Git repository"
        return 1
    fi
    
    success "Git repository detected"
    
    # Check remote URL
    local remote_url=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ "$remote_url" == *"Chess-trainer"* ]]; then
        success "Repository name matches expected GitHub Pages URL"
    else
        warning "Repository name may not match GitHub Pages URL"
        log "  Remote URL: $remote_url"
    fi
    
    # Check current branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    log "Current branch: $current_branch"
    
    if [[ "$current_branch" == "main" ]]; then
        success "On main branch (GitHub Pages deployment branch)"
    else
        warning "Not on main branch - GitHub Pages deploys from main"
    fi
}

generate_deployment_summary() {
    log "Generating deployment summary..."
    
    cat << EOF

♔ GITHUB PAGES DEPLOYMENT SUMMARY
═══════════════════════════════════════

🌐 Live URL: https://francescopuglia.github.io/Chess-trainer/
🏗️ Build Command: npm run build:github-pages
🚀 Deploy Trigger: Push to main branch
📁 Deploy Source: GitHub Actions

📋 VERIFICATION CHECKLIST:
════════════════════════════

✅ Vite configuration for GitHub Pages
✅ GitHub Actions workflow
✅ Environment configuration
✅ Local build test
✅ Git repository setup

🚀 NEXT STEPS:
══════════════

1. Commit and push your changes to main branch:
   git add .
   git commit -m "feat: configure GitHub Pages deployment"
   git push origin main

2. Enable GitHub Pages in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Save

3. Monitor deployment in Actions tab

4. Visit live URL after deployment completes

⚡ The deployment will be automatic after the first push!

EOF
}

main() {
    echo "♔ GitHub Pages Deployment Verification"
    echo "======================================"
    echo ""
    
    local checks_passed=0
    local total_checks=6
    
    # Run all checks
    if check_vite_config; then ((checks_passed++)); fi
    if check_github_workflow; then ((checks_passed++)); fi
    if check_package_scripts; then ((checks_passed++)); fi
    if check_environment_files; then ((checks_passed++)); fi
    if test_local_build; then ((checks_passed++)); fi
    if check_git_configuration; then ((checks_passed++)); fi
    
    echo ""
    echo "======================================"
    
    if [[ $checks_passed -eq $total_checks ]]; then
        success "All checks passed! ($checks_passed/$total_checks)"
        generate_deployment_summary
        exit 0
    else
        error "Some checks failed ($checks_passed/$total_checks)"
        echo ""
        echo "Please fix the issues above before deploying to GitHub Pages."
        exit 1
    fi
}

# Run main function
main "$@"