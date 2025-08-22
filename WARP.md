# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Office Snack App is a full-stack web application for tracking office snack purchases with Google OAuth authentication. It consists of:

- **Backend**: ASP.NET Core 9.0 Web API with Entity Framework and SQLite
- **Frontend**: React 19 + Vite with Material-UI components

## Development Commands

### Backend (.NET API)
```bash
# Navigate to backend directory
cd backend

# Restore dependencies
dotnet restore

# Run the API server (Development)
dotnet run

# Build the project
dotnet build

# Clean build artifacts
dotnet clean

# Database migrations
dotnet ef migrations add <MigrationName>
dotnet ef database update

# Run with specific profile
dotnet run --launch-profile http    # HTTP only (port 5106)
dotnet run --launch-profile https   # HTTPS + HTTP (ports 7162/5106)
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
cd backend && dotnet run

# Terminal 2: Start frontend dev server
cd frontend && npm run dev
```

## Architecture Overview

### Backend Architecture
- **Controllers**: REST API endpoints in `Controllers/` directory
  - `SnacksController`: Snack inventory and purchase operations
  - `UsersController`: User management and balance operations  
  - `AuthController`: Google OAuth authentication flow
  - `AdminController`: Administrative functions
- **Models**: Data entities (`User`, `Snack`, `Transaction`) in `Models/`
- **Data Layer**: Entity Framework context and seeding in `Data/`
- **Authentication**: Cookie-based auth with Google OAuth integration
- **Database**: SQLite with Entity Framework migrations

### Frontend Architecture  
- **React 19**: Main UI framework with functional components and hooks
- **Material-UI**: Component library for consistent styling
- **State Management**: Local React state with localStorage persistence
- **Authentication**: Redirects to backend OAuth endpoints
- **Cart System**: Client-side cart state with server-side checkout

### Key Integration Points
- **CORS Configuration**: Backend allows `http://localhost:5173` (Vite dev server)
- **Authentication Flow**: Frontend redirects to `/api/auth/signin-google`, backend handles OAuth and returns user data via URL parameters
- **API Communication**: Frontend makes requests to `http://localhost:5106/api/*` endpoints
- **User Persistence**: User data stored in localStorage and synced with backend

### Database Schema
- **Users**: Email (unique), DisplayName, Balance, IsAdmin, ProfilePictureUrl
- **Snacks**: Name, Price, Stock, IsAvailable, ImageUrl  
- **Transactions**: UserId, SnackId, TransactionAmount, Timestamp

## Configuration Notes

### Backend Configuration
- **Default Ports**: HTTP (5106), HTTPS (7162)
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
Google OAuth requires configuration in `appsettings.json` or user secrets:
```json
{
  "Authentication": {
    "Google": {
      "ClientId": "your-client-id",
      "ClientSecret": "your-client-secret"
    }
  }
}
```

For development, use `dotnet user-secrets` to store sensitive values.

### Domain Restrictions
The application is configured to only allow `@byui.edu` email addresses for authentication.
