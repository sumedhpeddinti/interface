# Ganesh Café — Production Full-Stack Restaurant Operating System

A complete, persistent, production-ready full-stack restaurant operating system for **Ganesh Café POS**, featuring a guest-facing QR Dining PWA and a Medusa-style managerial POS / back-of-house suite.

Backed by a Node.js + Express backend, PostgreSQL database with Prisma ORM, Socket.IO realtime event sync, JWT/PIN authentication, role-based authorization, server-side pricing/tax validation, and complete frontend integration.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (Local PostgreSQL instance or Render Postgres database)

### 2. Environment Setup
Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ganesh_cafe?schema=public"
JWT_SECRET="super-secret-jwt-key-replace-in-production"
CORS_ORIGIN="http://localhost:5173"
VITE_API_URL="http://localhost:4000/api"
```

### 3. Installation & Database Initialization
```bash
# Install dependencies
npm install

# Push database schema to PostgreSQL
npm run db:push

# Seed database with initial restaurant, staff, menu, tables, and orders
npm run db:seed
```

### 4. Running the Full Application
```bash
# Start both Backend API Server & Vite Frontend concurrently
npm run dev

# Or run backend / frontend separately:
npm run server  # Backend running on http://localhost:4000
npm run client  # Frontend running on http://localhost:5173
```

### 5. Running Tests & Production Build
```bash
# Run unit and integration tests (480 tests passing)
npm test

# Build production bundle (Vite + Prisma Client)
npm run build

# Start production server
npm start
```

---

## 🔑 Demo Staff Credentials

Role-based access is enforced via 4-digit PINs and authenticated backend JWT sessions:

| Staff Member | Role | PIN | Permissions |
|---|---|---|---|
| **Vinit Sharma** | Manager | `1234` | Full access (Overview, Menu, Tables, Orders, Billing, Drawer, Staff, Expenses, Campaigns, CRM, Reports) |
| **Priya Nair** | Cashier | `2222` | Overview, Floor, Orders, Billing, Cash Drawer, Invoices, Feedback |
| **Rakesh Yadav** | Kitchen | `3333` | Kitchen Display System (KDS), Live Orders |
| **Anil Kumar** | Cashier | `4444` | Cashier permissions |
| **Sunita More** | Kitchen | `5555` | Kitchen permissions |

---

## 🌐 Application Portals & Routes

| Route | Purpose | Access |
|---|---|---|
| `/` · `/t/:tableId` | Guest Dining PWA (Scan QR or select table) | Public |
| `/store` | Managerial POS Dashboard / Overview | Staff |
| `/store/tables` | Floor Plan & Interactive Table Layout | Staff |
| `/store/live-orders` | Live Order Queue & Order Lifecycle | Staff |
| `/store/kitchen` | Kitchen Display System (KDS) | Kitchen / Staff |
| `/store/billing` | POS Cashier Billing & Register | Cashier / Manager |
| `/store/cash-drawer` | Cash Drawer Shift Management & Petty Cash | Cashier / Manager |
| `/store/invoices` | Settled Invoices History & Receipts | Cashier / Manager |
| `/store/menu` | Menu Catalog & Category Management | Manager |
| `/store/qr-codes` | Table QR Code Studio & Print Sheets | Staff |
| `/store/guests` | Customer CRM & Marketing Opt-outs | Staff |
| `/store/campaigns` | WhatsApp & Push Marketing Console | Manager |
| `/store/expenses` | Store Expenses & P&L Analysis | Manager |
| `/store/staff` | Staff Account & Role Management | Manager |
| `/store/feedback` | Guest Feedback & Ratings Stream | Staff |

---

## 🛠 Target Architecture & Tech Stack

### Frontend Stack
- **Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS 4 (`@tailwindcss/vite`)
- **State Management**: `StoreContext.jsx` with REST API synchronization + Socket.IO realtime listeners + localStorage fallback

### Backend Stack
- **Runtime**: Node.js + Express 5
- **Database**: PostgreSQL
- **ORM**: Prisma ORM v6.4.0
- **Realtime**: Socket.IO v4.8
- **Authentication**: JWT (JSON Web Tokens) with HTTP-only cookies / Bearer headers & bcryptjs PIN hashing
- **Validation**: Zod schema validation
- **Security**: Helmet, CORS, Rate Limiting

---

## ☁️ Render Free-Tier Deployment Guide

To deploy this application to **Render (Free Tier)**:

1. **Create PostgreSQL Database on Render**:
   - Create a new PostgreSQL database instance on Render.
   - Copy the **Internal Database URL** or **External Database URL**.

2. **Create Web Service on Render**:
   - Connect your GitHub repository: `https://github.com/sumedhpeddinti/interface`.
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build && npm run db:push && npm run db:seed`
   - **Start Command**: `npm start`

3. **Set Environment Variables on Render**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `<Your Render PostgreSQL URL>`
   - `JWT_SECRET`: `<Random Secret String>`
   - `CORS_ORIGIN`: `*`
   - `PORT`: `10000` (Render default)

Render will build the Vite frontend into `dist/`, initialize PostgreSQL tables, seed default data, and start the Express server which serves both the API endpoints and the static SPA frontend!

---

## 🧪 Testing

The repository contains 480 unit and integration tests across 14 test files:

```bash
npm test
```

Tests cover:
- Order state machine transitions (`sent` -> `accepted` -> `cooking` -> `ready` -> `served` -> `paid` / `void`)
- Server-side tax & discount computations
- Cash drawer shift float and variance calculations
- REST API endpoint authentication & payload validation
- React component rendering & navigation routes
