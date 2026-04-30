# Harmony HR - Split Frontend/Backend Workspace

This workspace is now organized as follows:

- `frontend/` - React UI app (Vite + TypeScript)
- `backend/` - Node/Express API (Knex, PostgreSQL)

## Backend + Frontend integration

Backend serves static UI from `../frontend/dist` when `start:prod` is run.

## Running locally (development)

1. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

2. Backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`

Frontend env URL should point to backend API (e.g. `VITE_API_URL=http://localhost:3000/api`).

## Running production (from backend)

1. `cd backend`
2. `npm install`
3. `npm run start:prod`

This runs:

- `npm run build:frontend` (builds UI into `frontend/dist`)
- `npm run build` (builds backend TS)
- `npm run start` (starts backend with static UI)
