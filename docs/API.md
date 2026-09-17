# Ganesh Café POS — REST API & Realtime Documentation

This document describes the REST API endpoints and Socket.IO realtime events for **Ganesh Café POS**.

## Base URL
- Development: `http://localhost:4000/api`
- Production (Render): `https://your-render-app.onrender.com/api`

---

## Authentication & Authorization

All managerial and staff endpoints require a valid JWT token passed in either:
- HTTP Header: `Authorization: Bearer <token>`
- Cookie: `token=<jwt_string>`

### User Roles
- `Manager` (Platform Admin, menu edit, staff edit, reports, campaigns, expenses)
- `Cashier` (Billing, cash register, tables, live orders, feedback)
- `Kitchen` (KDS, live orders)

---

## API Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| **GET** | `/api/health` | Public | System and database health status |
| **GET** | `/api/bootstrap` | Public / Staff | Hydrate complete application state |
| **POST** | `/api/auth/login` | Public | Staff PIN login (`1234`, `2222`, `3333`) |
| **GET** | `/api/auth/me` | Staff | Current session user details |
| **POST** | `/api/auth/logout` | Staff | Clear auth cookie |
| **GET** | `/api/auth/staff` | Manager | List staff members |
| **POST** | `/api/auth/staff` | Manager | Create staff member |
| **GET** | `/api/menu` | Public | Get menu items |
| **POST** | `/api/menu` | Manager | Create menu item |
| **PATCH** | `/api/menu/:id` | Manager | Update menu item |
| **DELETE** | `/api/menu/:id` | Manager | Soft-delete menu item |
| **GET** | `/api/tables` | Public | List tables |
| **PATCH** | `/api/tables/:id` | Staff | Update table layout position / reservation |
| **GET** | `/api/orders` | Public / Staff | List order rounds |
| **POST** | `/api/orders` | Public / Staff | Submit new order round |
| **PATCH** | `/api/orders/:id/status` | Staff | Update order status (`accepted`, `cooking`, `ready`, `served`, `paid`, `void`) |
| **POST** | `/api/payments/settle` | Staff | Atomic payment settlement for table |
| **GET** | `/api/cash-drawer/shift` | Staff | Current shift & drawer history |
| **POST** | `/api/cash-drawer/open` | Staff | Open new shift with float |
| **POST** | `/api/cash-drawer/transaction` | Staff | Cash in / Cash out transaction |
| **POST** | `/api/cash-drawer/close` | Staff | Close shift & calculate variance |
| **GET** | `/api/expenses` | Manager | List expense records |
| **POST** | `/api/expenses` | Manager | Create expense record |
| **GET** | `/api/guests` | Staff | List CRM guests |
| **PATCH** | `/api/guests/:id/opt-out` | Staff | Toggle guest marketing opt-out |
| **GET** | `/api/campaigns` | Manager | List marketing campaigns |
| **POST** | `/api/campaigns` | Manager | Create marketing campaign |
| **GET** | `/api/feedback` | Staff | List guest ratings & feedback |
| **POST** | `/api/feedback` | Public / Staff | Submit guest feedback |

---

## Realtime Events (Socket.IO)

Clients connect to `ws://localhost:4000` and emit `join_restaurant` with `restaurantId`.

Emitted events:
- `order:created` — New guest or counter round placed
- `order:updated` — KDS status transition (`accepted`, `cooking`, `ready`, `served`)
- `table:updated` — Table moved or reserved status changed
- `menu:updated` — Item added or updated
- `shift:updated` — Cash drawer shift opened/closed/transaction logged
- `invoice:created` — Bill settled and table freed
- `feedback:created` — Guest feedback submitted
