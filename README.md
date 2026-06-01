# Office Snack App

## Environment Configuration

Create an `.env` file in both `backend/` and `frontend/` (see `.env.example`
files) for local overrides. In production, set environment variables via your
hosting provider.

- Backend env keys:
  - `PORT` (defaults to 3000)
  - `NODE_ENV` (development/production)
  - `FRONTEND_URL` (e.g., http://localhost:5173 or your domain)
  - `SESSION_SECRET`
  - `MAIN_SITE_URL`
  - `DATABASE_PATH` (optional; otherwise `./SnackTracker.db` is used)
  - `GOOGLE_SHEETS_API_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`

- Frontend env keys (Vite):
  - `VITE_API_BASE_URL` (e.g., http://localhost:3000)
  - `VITE_FRONTEND_URL` (optional; used for redirects/links)
