# IIP Billing Pro — Product Requirements Document

## Original Problem Statement
Professional GST billing & invoicing app for **Indian Industrial Products (IIP)**. Blue/Orange/White theme, mobile-first, web + Android compatible. Plans: Free / Pro (₹95) / Premium (₹289). Modules: Dashboard, Quotations, Invoices, Proforma, Purchase Orders, Delivery Challans, Credit Notes, Expenses, Customers, Suppliers, Products, Inventory, Reports, Settings. Invoice features: GST (CGST/SGST/IGST), auto number, digital signature, logo, PDF export, WhatsApp & Email share. Bottom nav: Home, Bills, Products, Parties, More. Admin features.

## User Choices
- Auth: Email + Password (JWT)
- Payments: Razorpay (for subscriptions)
- Sharing: WhatsApp (wa.me) + Email (mailto)
- Scope v1: strong working core first
- PDF: clean GST invoice (Swipe-like) + 5 templates (Classic/Modern/Premium/Industrial/Blue Professional)

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT bearer auth (bcrypt). Owner-scoped multi-tenant data. GST computed server-side (intra-state CGST+SGST vs inter-state IGST by comparing company.state vs customer.state). Monotonic per-owner+type invoice numbering via `counters` collection. Free-plan 10 invoices/month enforcement.
- **Frontend**: React + Tailwind + shadcn/ui. AuthContext (token in localStorage `iip_token`). Sidebar (desktop) + bottom nav (mobile). Recharts dashboard. Print-CSS based PDF export with 5 invoice templates.

## User Personas
- Small/medium Indian industrial business owner creating GST invoices, tracking payments, managing customers & inventory.
- Admin (seeded: admin@iipbilling.com / Admin@123, premium).

## Implemented (2026-06-09)
- ✅ Email/password auth (register/login/me), admin seeding
- ✅ Dashboard: Total Sales, Pending Payments, Monthly Revenue chart, Top Customers, Recent Invoices, Low Stock Alerts
- ✅ Customers (Parties) CRUD with GSTIN/state/addresses
- ✅ Products CRUD with HSN, GST rate, stock, low-stock threshold
- ✅ Invoices: create/edit, line items, live GST totals, CGST/SGST/IGST, auto number, status, stock decrement
- ✅ Quotations & Proforma documents (no monthly limit)
- ✅ Invoice view: 5 PDF templates, Print/PDF, WhatsApp share, Email share, UPI QR
- ✅ Settings: company profile, bank/UPI, default template
- ✅ Plans page (Free/Pro/Premium pricing)
- ✅ Mobile bottom nav + More page
- ✅ Tested: 27/27 backend pytest pass, frontend e2e 100%

## Backlog (prioritized)
### P0 (next)
- Razorpay subscription checkout (Pro/Premium upgrade) — currently shows "coming soon"
- Real email sending (Resend/SendGrid) for invoice share & payment reminders (currently mailto/wa.me)
### P1
- Purchase Orders, Delivery Challans, Credit Notes, Expenses modules
- Suppliers management; Reports (advanced)
- Stock re-adjustment on invoice edit/delete
- Admin panel (user management, subscription/payment tracking, analytics)
### P2
- Inventory module, E-Way Bill, E-Invoice, Barcode scanner, Multi-user, Portals (customer/supplier/manufacturer), Data backup/restore
- Add 5+ more invoice templates to reach 10+

## Next Tasks
1. Wire Razorpay for Pro/Premium subscriptions (test key available in env).
2. Real email integration for sharing + payment reminders.
3. Build remaining Pro modules (PO, Delivery Challan, Credit Notes, Expenses).
