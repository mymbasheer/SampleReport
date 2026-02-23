# BizLedger - POS Business Report Viewer

## Overview
Mobile app for viewing POS (Point of Sale) business reports from SQLite database files. Users can load their POS database from cloud storage (Google Drive, OneDrive, Dropbox) via the device's native document picker, or use a pre-loaded sample database.

## Architecture
- **Frontend**: Expo (React Native) with Expo Router file-based routing
- **Backend**: Express.js server on port 5000
- **Database**: SQLite files read via better-sqlite3 (read-only)
- **State Management**: React Query for server state

## Key Features
- Welcome screen with cloud drive file picker integration
- Dashboard with stock/customer/supplier balance summaries
- Stock Report with product quantities and values
- Customer Report with outstanding receivables
- Supplier Report with outstanding payables
- Detail views for individual customer/supplier documents

## Project Structure
```
app/
  _layout.tsx         - Root layout with Stack navigation
  index.tsx           - Welcome/file picker screen
  +not-found.tsx      - 404 screen
  (tabs)/
    _layout.tsx       - Tab layout (Dashboard, Stock, Customers, Suppliers)
    index.tsx         - Dashboard tab
    stock.tsx         - Stock Report tab
    customers.tsx     - Customer Report tab
    suppliers.tsx     - Supplier Report tab
  customer-detail/
    [id].tsx          - Customer document detail
  supplier-detail/
    [id].tsx          - Supplier document detail

server/
  index.ts            - Express server setup
  routes.ts           - API routes
  db.ts               - SQLite database management
  storage.ts          - User storage (legacy)

lib/
  query-client.ts     - React Query client and API helpers
  format.ts           - Number/date formatting utilities

constants/
  colors.ts           - Theme color palette
```

## API Endpoints
- GET /api/status - Check if database is loaded
- POST /api/upload-db - Upload a .db file (multipart form)
- GET /api/dashboard - Dashboard summary data
- GET /api/stock - Stock report
- GET /api/customers - Customer balances
- GET /api/suppliers - Supplier balances
- GET /api/customer/:id/documents - Customer sales documents
- GET /api/supplier/:id/documents - Supplier purchase documents

## Recent Changes
- 2026-02-20: Initial build with welcome screen, 4-tab layout, cloud file picker, backend SQLite integration
