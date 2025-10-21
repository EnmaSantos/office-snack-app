# Office Snack App

## Environment Configuration

Create an `.env` file in both `backend/` and `frontend/` (see `.env.example` files) for local overrides. In production, set environment variables via your hosting provider.

- Backend env keys:
  - `ASPNETCORE_ENVIRONMENT` (Development/Production)
  - `FrontendUrl` (e.g., http://localhost:5173 or your domain)
  - `ApiBaseUrl` (e.g., https://api.yourdomain.com)
  - `ConnectionStrings__DefaultConnection` (optional; otherwise SQLite file is used)
  - `Authentication__Google__ClientId`
  - `Authentication__Google__ClientSecret`

- Frontend env keys (Vite):
  - `VITE_API_BASE_URL` (e.g., http://localhost:5106)
  - `VITE_FRONTEND_URL` (optional; used for redirects/links)


