# ♔ GitHub Pages Deployment Guide

## 🌐 Live Application
**🔗 https://francescopuglia.github.io/Chess-trainer/**

## 🚀 Automatic Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions whenever code is pushed to the `main` branch.

### Deployment Process
1. **Build**: Application is built with GitHub Pages optimizations
2. **Test**: Quality checks and tests are run
3. **Deploy**: Built artifacts are deployed to GitHub Pages
4. **Verify**: Deployment is automatically verified

### Deployment Status
You can check the deployment status in the **Actions** tab of the GitHub repository.

## 🛠️ Manual Deployment

If you need to manually trigger a deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

## 🏗️ Local Build for GitHub Pages

To build locally with GitHub Pages configuration:

```bash
cd chess-trainer
npm run build:github-pages
```

This will:
- Set the correct base URL (`/Chess-trainer/`)
- Optimize for production
- Create a `404.html` for SPA routing fallback

## 🔧 Configuration

### Base URL
The application is configured to work with GitHub Pages' subfolder structure:
- **Base URL**: `/Chess-trainer/`
- **Live URL**: `https://francescopuglia.github.io/Chess-trainer/`

### Environment Variables
GitHub Pages deployment uses these settings:
- `VITE_GITHUB_PAGES=true`
- `VITE_BASE_URL=/Chess-trainer/`
- `NODE_ENV=production`

## 📊 Performance Optimizations

The GitHub Pages build includes:
- ✅ Bundle splitting and optimization
- ✅ Asset compression and minification
- ✅ Service Worker for offline functionality
- ✅ Progressive Web App features
- ✅ Optimized chunk loading

## 🔍 Troubleshooting

### Common Issues

**404 on Page Refresh**
- ✅ Automatically handled with `404.html` fallback

**Assets Not Loading**
- Check that `base` URL is correctly set in `vite.config.ts`
- Verify the repository name matches the base URL

**Deployment Fails**
- Check the Actions tab for error logs
- Ensure all tests pass locally before pushing

### Debug Commands

```bash
# Test build locally
npm run build:github-pages
npm run preview

# Check deployment status
curl -I https://francescopuglia.github.io/Chess-trainer/

# Verify app content
curl https://francescopuglia.github.io/Chess-trainer/ | grep "Chess Trainer"
```

## 🎯 Features Available

### ✅ Working Features
- Chess board display and interaction
- Chess engine integration (Stockfish)
- Video upload and processing
- Sync point management
- SRS (Spaced Repetition System)
- Analytics and progress tracking
- Progressive Web App capabilities

### 🔄 GitHub Pages Limitations
- No server-side functionality
- Static hosting only
- No real-time features (WebSocket)
- File uploads stored locally (IndexedDB/OPFS)

## 📈 Performance Metrics

Target metrics for GitHub Pages deployment:
- **First Contentful Paint**: < 2s
- **Largest Contentful Paint**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 4s

## 🔐 Security

GitHub Pages deployment includes:
- Content Security Policy (CSP) headers
- Secure asset loading
- HTTPS by default
- No sensitive data exposure

## 📱 PWA Features

The application is deployed as a Progressive Web App with:
- Offline functionality
- App installation capability
- Service Worker for caching
- Manifest for app metadata

## 🚀 Future Enhancements

Planned improvements for GitHub Pages deployment:
- Lighthouse CI integration for performance monitoring
- Automated accessibility testing
- Visual regression testing
- Bundle size monitoring

---

**Last Updated**: January 2024
**Deployment**: Automated via GitHub Actions
**Status**: ✅ Active and Monitored