# AI Journal Trading App (Demo)

Trading journal + productivity app with backtesting, plans, and focus tracking. Deployed on Vercel with Turso cloud database.

## Features
- **Trading Logs**: Record and analyze trades with stats breakdown
- **Plan Sessions**: Create daily/weekly trading plans with prediction cards
- **Backtest Lab**: Import CSV, dashboard with equity curve, win rate, by-symbol/strategy analysis
- **Focus**: Goals, habits with streaks, tasks
- **Signals & Executions**: Signal feed from local agents
- **No AI/MT5**: Fully self-contained demo — no OpenRouter, no Python, no MetaTrader

## Stack
- **Frontend**: Vite + React + TypeScript (pre-built)
- **Backend**: Express (serverless on Vercel via `api/index.js`)
- **Database**: Turso (libsql) — SQLite-compatible cloud database

## Deploy to Vercel

### Prerequisites
1. [Turso account](https://turso.tech) — free tier: 500MB storage + 9GB bandwidth
2. [Vercel account](https://vercel.com)

### Setup
```bash
# 1. Install Turso CLI and create database
turso db create ai-journal-trading
turso db show ai-journal-trading --url   # Copy DB URL
turso db tokens create ai-journal-trading  # Copy auth token

# 2. Set environment variables in Vercel
# TURSO_DB_URL=<your-db-url>
# TURSO_AUTH_TOKEN=<your-auth-token>

# 3. Deploy
npx vercel --prod
```

### Local Development
```bash
# Set env vars
cp .env.example .env
# Edit .env with your Turso credentials

# Install deps
npm install

# Run
node api/index.js
# Opens at http://localhost:3000
```

## Architecture
```
Vercel Edge/Functions         Turso
  api/index.js ───────────────► libsql
  frontend/dist/ ◄────────────  (static)
```

## Project Structure
```
├── api/
│   ├── index.js          # Express app entry
│   ├── db.js             # Turso client singleton
│   ├── migrate.js        # Schema + indexes
│   ├── package.json
│   └── routes/
│       ├── crud.js         # Generic auto-CRUD factory
│       ├── focus.js        # Goals, habits, toggle
│       ├── trading.js      # Trading logs stats, scans
│       ├── sessions.js     # Plan/backtest sessions, stats, CSV import
│       ├── plans.js        # Plan status workflow, review
│       ├── signals.js      # Signal + execution logs
│       ├── daily-plans.js  # Daily plans CRUD
│       ├── settings.js     # Key-value settings
│       └── health.js       # Health check
├── frontend/dist/        # Pre-built Vite frontend
├── vercel.json
├── package.json
└── .env.example
```
