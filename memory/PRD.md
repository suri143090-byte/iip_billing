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

## Production Expansion (2026-06-09)
- ✅ Purchase Orders, Delivery Challans, Credit Notes (reuse document engine; prefixes PO/DC/CN)
- ✅ Expenses module (CRUD, categories, payment modes, summary cards)
- ✅ Inventory Management (stock levels, valuation, stock-in/out adjustments + movement log)
- ✅ Suppliers (parties type=supplier)
- ✅ Admin Panel (stats/MRR, user management, plan change, payment tracking, analytics pie) — role-guarded
- ✅ Razorpay subscriptions (Pro ₹95 / Premium ₹289, 30-day unlock) — order create + signature verify + plan upgrade. NEEDS KEYS (RAZORPAY_KEY_ID/SECRET) — graceful 400 + UI message until provided
- ✅ Resend email invoice sending — NEEDS KEY (RESEND_API_KEY); frontend falls back to mailto until provided
- ✅ Real downloadable PDF (jsPDF + html2canvas); UPI QR generated client-side (qrcode lib)
- ✅ All "Coming Soon" placeholders removed; full sidebar + grouped More page
- ✅ Invoice stock rollback on edit/delete; plan enum validation; admin role-guard fetch
- ✅ Tested: 54/54 backend pytest pass, frontend e2e 100%, deployment health check PASS

## Pending keys (user to provide for full functionality)
- RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (Razorpay dashboard) → enables live subscription checkout
- RESEND_API_KEY (resend.com) → enables real email sending (else mailto fallback)

## Next Tasks
1. Add Razorpay + Resend keys to backend .env to activate payments & email.
2. (Optional) Razorpay webhook for auto-renewal/reconciliation; recurring mandates.
3. (Optional) E-Way Bill / E-Invoice (IRN), barcode scanner, multi-user roles, customer/supplier portals, data backup/restore.
4. Deploy via platform Deploy button; attach custom domain via platform settings.
