# Project Operating Guide

## Environment Guidelines
- Package manager: pnpm (do NOT run `npm install`).
- Do NOT reinstall packages unless explicitly asked.
- All dependencies are already installed.
- Use `pnpm run build` or `npx tsc --noEmit` to verify code changes.
- Never run long-running background servers (`pnpm run dev`) that block the terminal.

## Project Context
- Stack: Vite, React, TypeScript, Leaflet, React-Leaflet, Turf.js.
- Architecture: Client-side only SPA. No backend or database.
- Goal: Midpoint meetup web app calculating optimal network routes and deep-linking to Google Maps.
