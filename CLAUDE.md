# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cerebro is a geospatial platform for analyzing real-time satellite data. It is a monorepo with two independent packages:

- `frontend/` — React 19 + Vite 8 + TypeScript 5.9 + Tailwind CSS v4 SPA
- `backend/` — Node.js 22 + Express 5 + TypeScript 6 REST API

Each package manages its own `node_modules` and `package.json`. Always `cd` into the relevant directory before running commands.

## Commands

### Frontend (`cd frontend`)

```bash
npm install        # Install dependencies
npm run dev        # Dev server with HMR (Vite)
npm run build      # Type-check + production build → dist/
npm run lint       # ESLint
npm run format     # Prettier (write)
npm run preview    # Preview production build locally
```

### Backend (`cd backend`)

```bash
npm install        # Install dependencies
npm run dev        # Dev server with watch mode (ts-node/esm)
npm run build      # Compile TypeScript → dist/
npm run lint       # ESLint
npm run typecheck  # tsc type-check only (no emit)
npm run format     # Prettier (write)
npm test           # Run unit tests
```

The backend entry point is `backend/src/index.ts`. It compiles to `backend/dist/` using `module: nodenext`.

## Architecture

### Backend

`backend/src/index.ts` is currently the only source file — it creates an Express app with `cors`, `helmet`, and `express.json()` middleware, and exposes a `GET /health` endpoint. The server listens on `PORT` (default `3000`) bound to `0.0.0.0`.

### Frontend

`frontend/src/main.tsx` mounts the React app. `frontend/src/App.tsx` is the root component. No routing library is set up yet.

## CI

GitHub Actions (`.github/workflows/ci.yaml`) runs on PRs to `main`. Two parallel jobs — `frontend-ci` and `backend-ci` — each run: install → lint → typecheck → test → build → SonarQube scan. Both require a `SONAR_TOKEN` secret. Node.js 22 is required.

## TypeScript Configuration

The backend uses strict TypeScript with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. All imports in backend source files must use explicit file extensions (e.g., `import foo from './foo.js'`) due to `module: nodenext`.

## Linting & Formatting

Both packages use **ESLint** (flat config) and **Prettier**. A shared `.prettierrc` lives at the repo root. Run `npm run lint` and `npm run format` inside either package. `eslint-config-prettier` is applied last in both ESLint configs to prevent rule conflicts.

> Note: `typescript-eslint` v8 declares a peer dep of `typescript <6.0.0`. The backend uses TypeScript 6 and installs with `--legacy-peer-deps`. This is expected until `typescript-eslint` adds official TypeScript 6 support.
