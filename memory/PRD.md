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

## Document Engine Enhancements (2026-06-09)
- ✅ Per-item multi-line **Description** field — shown as its own column in the GST PDF
- ✅ Per-item **Discount** with toggle: Percentage (%) or Direct Amount (₹); discount applied BEFORE GST
- ✅ Industrial GST PDF columns: Sr / Item / Description / HSN-SAC / Qty / Rate / Discount / Taxable / GST% / CGST / SGST / IGST / Amount
- ✅ **Additional Charges** section (Freight, Packing, Loading, Other) — each with its own GST %, taxed and added to totals
- ✅ Applied uniformly across all 6 document types (Invoice, Quotation, Proforma, Purchase Order, Delivery Challan, Credit Note) via shared DocumentForm + InvoiceDocument
- ✅ Auto recalculation (live summary), responsive form, PDF/Print export
- ✅ Tested: 65/65 backend pytest pass, frontend e2e 100% (₹1062 / ₹1298 / ₹1112 verified)

## Reference-Layout Upgrade (2026-06-09)
- ✅ Item entry is now a **single-row table** (# | Item | Description | HSN/SAC | Qty | Rate | Discount | GST% | Amount); horizontal scroll on mobile, table on desktop/PDF
- ✅ Dedicated multi-line **Description** column in form + PDF/Print
- ✅ Discount toggle (% / ₹) with live recalculation (unchanged logic, applied before GST)
- ✅ **GSTIN auto-fill**: validates 15-char GSTIN, auto-detects state from state code, auto CGST+SGST vs IGST, saved in customer master
- ✅ **Auto address**: selecting a customer shows auto-filled Billing/Shipping/GSTIN/Contact/Place-of-Supply + tax-type badge
- ✅ Customer master adds **Contact Person**; document stores **place_of_supply**
- ✅ Professional A4 PDF: logo + company details, Bill To (with Attn), Ship To + Place of Supply, item table w/ Description+Discount+GST columns, charges, Terms, Authorized Signatory, footer (phone/email/website)
- ✅ Same structure across all 6 document types; Freight/Packing/Loading/Other charges each with own GST
- ✅ Tested: 79/79 backend pytest pass; frontend single-row table + GSTIN auto-detect + live math verified

## Admin Panel + RBAC & Smart Units (2026-06-09)
- ✅ **Backend RBAC**: all user data endpoints owner-scoped; cross-user access returns 404; every `/api/admin/*` route guarded by `require_admin` (403 for non-admins). Verified: User A cannot read/update/delete User B docs.
- ✅ **Admin Panel** (`/admin`): 5 KPIs (Total Users, Total Documents, Sales Value, Subscription Revenue, MRR); Documents tab across ALL users with filters (type, user, search by number/company/GSTIN/customer/email, date range) + view modal with **PDF download/print** for any user's doc; Users tab (plan change, delete non-admins, profile+company+counts modal); Products & Customers cross-company views; Payments; Analytics pie.
- ✅ New admin APIs: `/admin/users/{id}`, `/admin/documents` (filters), `/admin/documents/{id}`, `/admin/products`, `/admin/customers`; enhanced `/admin/stats`.
- ✅ **Smart Unit selector** (UnitCombobox): prefix search, first-match highlight, Enter/Arrow keys, max 5, common-first — used in Product Master + every document line item (new Unit column; unit shown in PDF Qty cell).
- ✅ Hardening: admin bypasses free-plan invoice limit; delete returns 404 when not owned/found.
- ✅ Tested: 97/97 backend pytest pass; admin UI + unit search verified via Playwright.

## Next Tasks
1. Add Razorpay + Resend keys to backend .env to activate payments & email.
2. (Optional) Razorpay webhook for auto-renewal/reconciliation; recurring mandates.
3. (Optional) E-Way Bill / E-Invoice (IRN), barcode scanner, multi-user roles, customer/supplier portals, data backup/restore.
4. Deploy via platform Deploy button; attach custom domain via platform settings.
