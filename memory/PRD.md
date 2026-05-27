# Enterprise OS - ERP & CRM Blueprint

## Original Problem Statement
Build a general ERP and CRM blueprint application using React (frontend) and Nest.JS (backend) - **switched to FastAPI per environment constraints**. Must include a Dockerfile so the app can be deployed across numerous images.

## User Choices Captured
- Backend: FastAPI (Python 3.11) - locked Python env in Dockerfile
- Modules: Both CRM + ERP integrated
- User Management: Multi-tenant support with RBAC (Admin, Manager, Sales, User)
- Design: Minimal/clean interface (Swiss & High-Contrast archetype)
- Integrations: Email automation blueprint, Stripe payment blueprint
- **Throttling**: All write operations, per-user limits, custom rate values

## Architecture
- **Frontend**: React 19 + Tailwind + shadcn/ui + dnd-kit + recharts
- **Backend**: FastAPI + Motor (async MongoDB) + JWT (HTTPOnly cookies) + bcrypt + slowapi
- **Database**: MongoDB 7
- **Deployment**: Docker (Python 3.11.15 locked) + docker-compose

## Implemented (2026-05-27)
### Backend
- Multi-tenant authentication (JWT cookies, bcrypt, admin seeding)
- CRM endpoints: leads, contacts, deals, pipeline stages (drag-drop move)
- ERP endpoints: inventory, invoices (auto-numbered), suppliers, purchase orders
- Email campaigns (draft blueprint, SendGrid/Resend ready)
- Payment integration via emergentintegrations StripeCheckout
- Rate limiting (slowapi): Payments 5/min, Inv/PO 20/min, general writes 60/min, auth 10/min
- Dashboard aggregated stats endpoint

### Frontend
- Brutalist Swiss design (Chivo + IBM Plex Sans + Mono)
- Auth flows (login/register) with demo credentials
- Sidebar layout with org switcher + breadcrumbs
- Dashboard with KPI cards + revenue chart
- All CRUD pages for CRM + ERP modules
- Drag-and-drop Kanban pipeline (dnd-kit)
- Stripe payment packages page with polling success flow
- Global 429 toast handler for throttle responses
- Settings page showing security + throttle config

### DevOps
- Backend Dockerfile (python:3.11.15-slim locked)
- Frontend Dockerfile (multi-stage with nginx)
- docker-compose.yml (mongo + backend + frontend)
- nginx config for SPA routing

## Test Credentials
- admin@erp-crm.com / admin123

## Backlog (P1/P2)
- P1: Connect real SendGrid/Resend API key (currently blueprint only)
- P1: User invite + role assignment within tenant (currently single admin per org)
- P2: Pipeline stage management UI (currently seeded defaults)
- P2: Invoice PDF generation + email send
- P2: Inventory threshold alerts
- P2: Audit log per tenant
