# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Office Snack App is a full-stack web application for tracking office snack purchases with Google OAuth authentication. It consists of:

- **Backend**: Node.js + Express TypeScript API with sql.js-backed SQLite
- **Frontend**: React 19 + Vite with Material-UI components

## Development Commands

### Backend (Node.js API)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run the API server (Development)
npm run dev

# Build the project
npm run build

# Run production entrypoint
npm start
```

### Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Full Application Development
```bash
# Terminal 1: Start backend API
cd backend && npm run dev

# Terminal 2: Start frontend dev server
cd frontend && npm run dev
```

## Architecture Overview

### Backend Architecture
- **Routes**: REST API endpoints in `backend/src/routes`
  - `snacks.ts`: Snack inventory and purchase operations
  - `users.ts`: User management and balance operations
  - `auth.ts`: Main-site cookie sync and session flow
  - `admin.ts`: Administrative functions
- **Services**: Inventory, Google Sheets, and weekly credit logic in `backend/src/services`
- **Data Layer**: SQLite setup, query helpers, and seeding in `backend/src/db`
- **Authentication**: Cookie-based session auth integrated with the main site
- **Database**: SQLite file created automatically at startup

### Frontend Architecture  
- **React 19**: Main UI framework with functional components and hooks
- **Material-UI**: Component library for consistent styling
- **State Management**: Local React state with localStorage persistence
- **Authentication**: Redirects to backend OAuth endpoints
- **Cart System**: Client-side cart state with server-side checkout

### Key Integration Points
- **CORS Configuration**: Backend allows `http://localhost:5173` (Vite dev server)
- **Authentication Flow**: Frontend redirects to `/api/auth/signin-google`, backend handles OAuth and returns user data via URL parameters
- **API Communication**: Frontend makes requests to `http://localhost:3000/api/*` endpoints
- **User Persistence**: User data stored in localStorage and synced with backend

### Database Schema
- **Users**: Email (unique), DisplayName, Balance, IsAdmin, ProfilePictureUrl
- **Snacks**: Name, Price, Stock, IsAvailable, ImageUrl  
- **Transactions**: UserId, SnackId, TransactionAmount, Timestamp

## Configuration Notes

### Backend Configuration
- **Default Port**: HTTP 3000
- **Database**: SQLite file (`SnackTracker.db`) created automatically
- **Seeding**: Automatic database seeding with sample data on startup
- **Authentication**: Requires Google OAuth credentials in configuration
- **CORS**: Configured for frontend development server

### Frontend Configuration
- **Development Port**: 5173 (Vite default)
- **Build Tool**: Vite with SWC for fast compilation
- **Theme**: Custom Material-UI theme with BYU colors
- **State Persistence**: User authentication state persisted in localStorage

### Authentication Setup
Local configuration lives in `backend/.env`. Start from `backend/.env.example`
and set values such as `SESSION_SECRET`, `FRONTEND_URL`, `MAIN_SITE_URL`, and
the Google Sheets API settings.

### Domain Restrictions
The application is configured to only allow `@byui.edu` email addresses for authentication.
