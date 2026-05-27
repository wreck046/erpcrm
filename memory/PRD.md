# Enterprise OS - ERP & CRM Blueprint

## Original Problem Statement
Build a general ERP and CRM blueprint application using React + FastAPI (originally requested Nest.JS/Golang, switched to FastAPI). Multi-tenant + RBAC. Both CRM + ERP. Email automation + payment blueprints. Docker with locked Python.

## Implementation Log

### Iteration 1 (2026-05-27)
- Multi-tenant auth (JWT cookies + bcrypt), admin seeding
- CRM: leads, contacts, deals + drag-drop pipeline (dnd-kit)
- ERP: inventory, invoices (10% tax), suppliers, purchase orders
- Email campaigns (draft blueprint)
- Stripe payment integration (5 plans, polling success flow)
- slowapi throttling: payments 5/min, inv/po 20/min, general 60/min, auth 10/min
- Dockerfile (Python 3.11.15 locked) + docker-compose
- Result: 19/19 backend tests passing

### Iteration 2 (2026-05-27)
- **User invite system**: admin/manager can invite, manager limited to sales/user roles
  - Two modes: email invite (Resend) OR direct create with temp password
  - PATCH /users/{id}/role for role updates, DELETE /users/{id} (admin only)
  - Accept-invite public page with token verification
- **Resend email integration**: real API with key, HTML invitation emails
  - Testing mode: only delivers to ivankoroh46@gmail.com (Resend signup), token still saved for manual share
- **Atomic invoice/PO sequences**: MongoDB counters collection with findOneAndUpdate $inc
  - Per-tenant scoped (key: '{org_id}:invoice')
  - Race-safe for concurrent POSTs
- Critical bug fixed: invitation expiry operator-precedence (testing agent caught it)
- Result: 35/35 backend tests passing, frontend 100%

## Test Credentials
- admin@erp-crm.com / admin123

## Backlog
- P2: Split server.py into routers/ modules (auth, crm, erp, payments, users)
- P2: Move email sending to BackgroundTasks (currently blocks request 100-300ms)
- P2: Verify a Resend domain to send invites to real users
- P3: Pipeline stage management UI, invoice PDF export, audit log per tenant
- P3: Switch cookie secure=True via env var for production
