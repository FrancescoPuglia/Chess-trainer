# Chess Trainer Enterprise

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success.svg)](https://francescopuglia.github.io/Chess-trainer/)
[![Build Status](https://github.com/FrancescoPuglia/Chess-trainer/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/FrancescoPuglia/Chess-trainer/actions)

Professional chess training application with advanced analysis, video synchronization, and enterprise-grade architecture.

## 🚀 Live Application

**[Visit Chess Trainer Enterprise →](https://francescopuglia.github.io/Chess-trainer/)**

## 📁 Project Structure

```
Chess-trainer/
├── chess-trainer/          # Main React application
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── dist/                # Build output
│   └── package.json         # Dependencies and scripts
├── .github/workflows/       # GitHub Actions for deployment
├── .nojekyll               # Disable Jekyll processing
└── README.md               # Project documentation
```

## 🛠️ Development

Navigate to the chess-trainer directory for development:

```bash
cd chess-trainer
npm install
npm run dev
```

## 🚀 Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions when changes are pushed to the main branch.

### Build Configuration
- **Production Build**: Optimized bundle with code splitting
- **GitHub Pages**: Simplified build for maximum compatibility
- **Base URL**: `/Chess-trainer/` for GitHub Pages subdirectory

## 📊 Features

- **Chess Engine Integration**: Stockfish engine with advanced analysis
- **Video Synchronization**: Sub-100ms precision video playback sync
- **Analytics Dashboard**: Advanced metrics and pattern recognition
- **Spaced Repetition**: FSRS-based learning system
- **Progressive Web App**: Offline-capable with service worker
- **Enterprise Architecture**: TypeScript, comprehensive testing, CI/CD

## 🔧 Technical Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Chess Logic**: Chess.js + Chessground
- **Styling**: Tailwind CSS
- **Database**: Dexie (IndexedDB)
- **Testing**: Vitest + Testing Library
- **Deployment**: GitHub Actions + GitHub Pages

---

**Built with ♔ Chess Trainer Enterprise**