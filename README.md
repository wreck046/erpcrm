# Enterprise OS — ERP & CRM Blueprint

A multi-tenant ERP + CRM blueprint application built with **React** (frontend) and **FastAPI** (backend), backed by **MongoDB**. Designed for clarity, speed and rigour.

## Stack

- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + dnd-kit + recharts
- **Backend**: FastAPI (Python 3.11) + Motor (async MongoDB) + JWT auth
- **Database**: MongoDB 7
- **Containerization**: Docker + docker-compose

## Modules

### CRM
- Leads management
- Contacts directory
- Sales Pipeline (Kanban board with drag-and-drop)

### ERP
- Inventory management
- Invoice generation (auto-numbered, tax-inclusive)
- Suppliers
- Purchase Orders

### Operations
- Email campaigns (SendGrid / Resend blueprint)
- Payments (Stripe Checkout integration)
- Multi-tenant settings & RBAC

## Security & Reliability

- **Authentication**: JWT in HTTPOnly cookies (24h TTL), bcrypt password hashing
- **Multi-tenant**: Strict org-id isolation on every read/write
- **RBAC**: Admin / Manager / Sales / User roles
- **Throttling**: Per-user rate limits via slowapi
  - Auth: 10/min
  - General writes: 60/min
  - Invoices / Purchase Orders: 20/min
  - Payments: 5/min

## Local Development

The backend and frontend run via supervisor in the dev container:
- Backend: `http://localhost:8001`
- Frontend: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`

### Default Credentials
```
admin@erp-crm.com / admin123
```

## Docker Deployment

```bash
# Build and run the full stack
docker-compose up --build

# Or build individually
docker build -t erp-crm-backend ./backend
docker build -t erp-crm-frontend ./frontend
```

### Environment Variables
Create a `.env` file at the root for docker-compose:

```env
DB_NAME=erp_crm_prod
JWT_SECRET=<your-strong-secret>
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=<strong-password>
STRIPE_API_KEY=<your-stripe-key>
REACT_APP_BACKEND_URL=http://your-backend-host:8001
```

The Python environment is **locked to Python 3.11.15** in the Dockerfile to ensure reproducible builds across any image.

## API

All routes are prefixed with `/api`. Key endpoints:

- `POST /api/auth/register` — Create tenant + admin user
- `POST /api/auth/login` — Returns JWT cookie
- `GET  /api/auth/me` — Current user
- `GET  /api/dashboard/stats` — Aggregated stats
- `POST /api/crm/leads` (60/min) — Create lead
- `POST /api/crm/deals` (60/min) — Create deal
- `PATCH /api/crm/deals/{id}` (60/min) — Move deal on pipeline
- `POST /api/erp/invoices` (20/min) — Generate invoice
- `POST /api/erp/purchase-orders` (20/min) — Create PO
- `POST /api/payments/checkout` (5/min) — Initiate Stripe session
- `POST /api/email/campaigns` (60/min) — Save campaign draft
