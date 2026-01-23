# Office Snack App - System Documentation

## Overview
The Office Snack App is a full-stack web application designed to manage an office snack fund. It allows users to purchase snacks using a digital credit system, tracks inventory with professional accounting logic, and provides administrators with tools to manage finances and stock.

**Tech Stack:**
- **Frontend:** React (Vite), Material UI
- **Backend:** .NET 8/9 Web API, Entity Framework Core
- **Database:** SQLite

---

## 1. Core Systems

### A. Authentication & User Accounts
The system uses a unique "Cookie Sync" mechanism designed to integrate with an existing organizational authentication system (Main Site).

- **Login Flow:**
  1. The app checks for authentication cookies from the main site.
  2. If valid, it retrieves the user's profile (Name, Email, Photo).
  3. It automatically creates or updates the user in the local `SnackTracker.db`.
  4. A local session is established.
- **Roles:**
  - **User:** Can view snacks, purchase items, and view their own transaction history.
  - **Admin:** Has access to the Admin Panel for inventory and financial management.

### B. The Digital Wallet (Balance System)
Users do not pay per transaction with cash/card. Instead, they maintain a balance.

- **Purchasing:** Buying a snack deducts its current price from the user's balance.
- **Negative Balance:** Users are allowed to go into negative balance (e.g., `-$4.50`), indicating they "owe" the fund money.
- **Top-Up:** Admins can manually add funds to a user's account when they hand over cash or Venmo the manager.

---

## 2. Inventory & Automatic Pricing Engine

This is the most advanced feature of the application, designed to ensure the fund remains sustainable regardless of inflation or fluctuating supplier prices.

### A. The "Batch" Concept
The system does not simply track a single "Stock Count." Instead, it tracks **Inventory Batches**.
- A "Batch" represents a single purchase receipt.
- **Data Stored:**
  - Purchase Date
  - Quantity Purchased
  - Total Cost / Unit Cost
  - Quantity Remaining (decreases as items are sold)

### B. Weighted Average Cost Pricing
The store price is **dynamic**. It is not set manually by an admin but is calculated automatically whenever inventory changes.

**The Formula:**
$$ \text{Raw Price} = \frac{\text{Total Value of All Active Batches}}{\text{Total Quantity of All Active Batches}} $$

**Rounding Rule:**
The calculated price is always rounded **UP** to the nearest nickel ($0.05).
- *Example:* Calculated cost is $0.62 -> Price becomes **$0.65**.
- *Example:* Calculated cost is $0.66 -> Price becomes **$0.70**.

### C. First-In, First-Out (FIFO) Consumption
When a user purchases a snack:
1. The system identifies the **oldest** batch that still has stock.
2. It deducts 1 item from that batch.
3. If that batch reaches 0, it is marked as inactive.
4. The system immediately recalculates the price based on the remaining batches.

**Why this matters:**
This ensures that "cheap" stock bought months ago is sold at a price reflecting its cost, while "expensive" new stock influences the price proportionally as it enters the mix.

---

## 3. Administrative Workflows

### A. Adding a New Snack
1. Navigate to **Admin Panel > Snack Management**.
2. Click **Add New Snack**.
3. **Required Inputs:**
   - **Name:** (e.g., "Doritos")
   - **Initial Quantity:** (e.g., 20)
   - **Total Cost:** (e.g., $10.00 - *from the receipt*)
4. **Result:** The system creates the snack and sets the initial price to **$0.50** ($10.00 / 20).

### B. Restocking an Existing Snack
1. Navigate to **Admin Panel**.
2. Click the **Restock (Box+) Icon** on the desired snack row.
3. **Required Inputs:**
   - **Quantity Purchased:** (e.g., 10)
   - **Total Cost:** (e.g., $15.00 - *inflation hit!*)
4. **Result:**
   - Stock increases by 10.
   - Price recalculates to blend the old stock ($0.50/unit) with the new stock ($1.50/unit).

### C. Financial Management
- **Adjust Balances:** Search for a user and add funds (e.g., "+$20.00") when they pay.
- **Transaction History:** View a global log of all purchases and balance adjustments to audit the fund.
- **Shopping List:** Generate a PDF report of items that need restocking based on current inventory levels.

---

## 4. Technical Architecture

### Backend Structure
- **Controllers:** Handle HTTP requests (`SnackController`, `AdminController`).
- **Services:** `InventoryService` contains the complex pricing and FIFO logic.
- **Data Layer:** EF Core manages the SQLite database.
  - `Snacks` Table: Stores current aggregate stock and display price.
  - `SnackBatches` Table: Stores the granular history of every purchase.
  - `Transactions` Table: Immutable log of every balance change.

### Frontend Structure
- **Vite/React:** Fast, modern single-page application (SPA).
- **Material UI:** Provides the polished, responsive interface components.
- **Anime.js:** Powers the playful animations (e.g., coin bursts when adding balance).

---

## 5. Deployment Guide

### Prerequisites
- .NET 8.0 SDK or later
- Node.js 18+

### Running Locally
1. **Backend:**
   ```bash
   cd backend
   dotnet run
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
3. Access at `http://localhost:5173`.
