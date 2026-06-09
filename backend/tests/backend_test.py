"""IIP Billing Pro – backend regression tests (pytest)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend env file
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@iipbilling.com"
ADMIN_PASSWORD = "Admin@123"


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def free_user():
    """Register a fresh free-plan user."""
    email = f"TEST_free_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "TEST Free User",
        "email": email,
        "password": "Test@1234",
        "company_name": "TEST Co",
    }, timeout=20)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="module")
def free_client(free_user):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {free_user['token']}", "Content-Type": "application/json"})
    return s


# ---------------- Health / Auth ----------------
class TestHealthAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert "IIP" in r.json().get("message", "")

    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_admin(self, admin_client):
        r = admin_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u.get("plan") == "premium"
        assert "password_hash" not in u
        assert "_id" not in u

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_register_duplicate_email(self, free_user):
        r = requests.post(f"{API}/auth/register", json={
            "name": "dup", "email": free_user["email"], "password": "Test@1234"
        }, timeout=10)
        assert r.status_code == 400

    def test_new_user_default_plan_free(self, free_user):
        assert free_user["user"]["plan"] == "free"
        assert free_user["user"]["email"] == free_user["email"].lower()


# ---------------- Company ----------------
class TestCompany:
    def test_get_company_default(self, free_client):
        r = free_client.get(f"{API}/company")
        assert r.status_code == 200
        d = r.json()
        assert d["state"] == "Karnataka"
        assert "_id" not in d

    def test_update_company_and_persist(self, free_client):
        payload = {
            "name": "TEST Industrial Co",
            "gstin": "29ABCDE1234F1Z5",
            "address": "Bangalore",
            "state": "Karnataka",
            "phone": "9999999999",
            "email": "test@co.com",
            "website": "test.co",
            "logo_url": "",
            "bank_name": "HDFC",
            "account_number": "12345",
            "ifsc": "HDFC0001",
            "upi_id": "test@upi",
            "signature_url": "",
            "default_template": "modern",
        }
        r = free_client.put(f"{API}/company", json=payload)
        assert r.status_code == 200, r.text
        # verify persistence
        g = free_client.get(f"{API}/company").json()
        assert g["name"] == "TEST Industrial Co"
        assert g["default_template"] == "modern"
        assert g["upi_id"] == "test@upi"


# ---------------- Customers ----------------
class TestCustomers:
    cust_id = None

    def test_create_customer(self, admin_client):
        payload = {"name": "TEST Customer KA", "gstin": "29AABCT1234A1Z5",
                   "phone": "9000000001", "email": "c@x.com",
                   "billing_address": "Addr", "shipping_address": "Addr",
                   "state": "Karnataka", "type": "customer"}
        r = admin_client.post(f"{API}/customers", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == payload["name"]
        assert d["state"] == "Karnataka"
        assert "id" in d
        TestCustomers.cust_id = d["id"]

    def test_list_customers_contains(self, admin_client):
        r = admin_client.get(f"{API}/customers")
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "TEST Customer KA" in names

    def test_update_customer(self, admin_client):
        cid = TestCustomers.cust_id
        assert cid
        payload = {"id": cid, "name": "TEST Customer KA Updated", "gstin": "", "phone": "9",
                   "email": "", "billing_address": "", "shipping_address": "", "state": "Karnataka",
                   "type": "customer"}
        r = admin_client.put(f"{API}/customers/{cid}", json=payload)
        assert r.status_code == 200
        # verify
        listing = admin_client.get(f"{API}/customers").json()
        found = [c for c in listing if c["id"] == cid][0]
        assert found["name"] == "TEST Customer KA Updated"

    def test_create_interstate_customer(self, admin_client):
        payload = {"name": "TEST Customer MH", "state": "Maharashtra", "type": "customer"}
        r = admin_client.post(f"{API}/customers", json=payload)
        assert r.status_code == 200
        TestCustomers.inter_id = r.json()["id"]

    def test_delete_customer(self, admin_client):
        cid = TestCustomers.cust_id
        r = admin_client.delete(f"{API}/customers/{cid}")
        assert r.status_code == 200
        listing = admin_client.get(f"{API}/customers").json()
        assert cid not in [c["id"] for c in listing]


# ---------------- Products ----------------
class TestProducts:
    pid = None

    def test_create_product(self, admin_client):
        payload = {"name": "TEST Ball Bearing", "hsn": "8482", "unit": "Nos",
                   "price": 100.0, "gst_rate": 18.0, "stock": 50, "low_stock_threshold": 5}
        r = admin_client.post(f"{API}/products", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST Ball Bearing"
        assert d["gst_rate"] == 18.0
        TestProducts.pid = d["id"]

    def test_list_products(self, admin_client):
        r = admin_client.get(f"{API}/products")
        assert r.status_code == 200
        assert any(p["id"] == TestProducts.pid for p in r.json())

    def test_update_product(self, admin_client):
        pid = TestProducts.pid
        payload = {"id": pid, "name": "TEST Ball Bearing v2", "hsn": "8482",
                   "unit": "Nos", "price": 120.0, "gst_rate": 18.0,
                   "stock": 50, "low_stock_threshold": 5}
        r = admin_client.put(f"{API}/products/{pid}", json=payload)
        assert r.status_code == 200
        listing = admin_client.get(f"{API}/products").json()
        found = [p for p in listing if p["id"] == pid][0]
        assert found["price"] == 120.0


# ---------------- Invoices / GST ----------------
class TestInvoices:
    intra_doc_id = None
    inter_doc_id = None

    def test_create_intrastate_invoice_cgst_sgst(self, admin_client):
        # ensure a KA customer + product
        cust = admin_client.post(f"{API}/customers", json={"name": "TEST INV KA Cust", "state": "Karnataka", "type": "customer"}).json()
        payload = {
            "type": "invoice",
            "customer_id": cust["id"],
            "items": [{"name": "Item A", "qty": 2, "rate": 100, "gst_rate": 18}],
            "discount": 0,
            "status": "unpaid",
            "template": "classic",
        }
        r = admin_client.post(f"{API}/documents", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_intra_state"] is True
        assert d["subtotal"] == 200.0
        assert d["cgst"] == 18.0
        assert d["sgst"] == 18.0
        assert d["igst"] == 0
        assert d["total"] == 236.0
        assert d["number"].startswith("INV/")
        TestInvoices.intra_doc_id = d["id"]

    def test_create_interstate_invoice_igst(self, admin_client):
        cust = admin_client.post(f"{API}/customers", json={"name": "TEST INV MH Cust", "state": "Maharashtra", "type": "customer"}).json()
        payload = {
            "type": "invoice",
            "customer_id": cust["id"],
            "items": [{"name": "Item B", "qty": 1, "rate": 1000, "gst_rate": 18}],
            "discount": 0,
            "status": "unpaid",
        }
        r = admin_client.post(f"{API}/documents", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_intra_state"] is False
        assert d["igst"] == 180.0
        assert d["cgst"] == 0
        assert d["sgst"] == 0
        assert d["total"] == 1180.0
        TestInvoices.inter_doc_id = d["id"]

    def test_get_invoice(self, admin_client):
        r = admin_client.get(f"{API}/documents/{TestInvoices.intra_doc_id}")
        assert r.status_code == 200
        assert r.json()["id"] == TestInvoices.intra_doc_id

    def test_toggle_invoice_status(self, admin_client):
        r = admin_client.patch(f"{API}/documents/{TestInvoices.intra_doc_id}/status", json={"status": "paid"})
        assert r.status_code == 200
        g = admin_client.get(f"{API}/documents/{TestInvoices.intra_doc_id}").json()
        assert g["status"] == "paid"

    def test_list_documents_invoice_filter(self, admin_client):
        r = admin_client.get(f"{API}/documents?type=invoice")
        assert r.status_code == 200
        assert all(d["type"] == "invoice" for d in r.json())

    def test_create_quotation_no_limit(self, admin_client):
        r = admin_client.post(f"{API}/documents", json={
            "type": "quotation",
            "items": [{"name": "Quote item", "qty": 1, "rate": 50, "gst_rate": 18}],
        })
        assert r.status_code == 200
        assert r.json()["number"].startswith("QUO/")

    def test_create_proforma_no_limit(self, admin_client):
        r = admin_client.post(f"{API}/documents", json={
            "type": "proforma",
            "items": [{"name": "Proforma item", "qty": 1, "rate": 50, "gst_rate": 18}],
        })
        assert r.status_code == 200
        assert r.json()["number"].startswith("PRO/")


# ---------------- Free plan 10/month limit ----------------
class TestFreePlanLimit:
    def test_free_user_blocked_after_10_invoices(self, free_client):
        cust = free_client.post(f"{API}/customers", json={"name": "TEST Free Cust", "state": "Karnataka"}).json()
        ok = 0
        blocked = False
        for i in range(11):
            r = free_client.post(f"{API}/documents", json={
                "type": "invoice",
                "customer_id": cust["id"],
                "items": [{"name": f"Item {i}", "qty": 1, "rate": 10, "gst_rate": 18}],
            })
            if r.status_code == 200:
                ok += 1
            elif r.status_code == 403:
                blocked = True
                assert "Free plan" in r.text or "limit" in r.text.lower()
                break
            else:
                pytest.fail(f"Unexpected status {r.status_code}: {r.text}")
        assert ok == 10, f"Expected 10 successful invoices, got {ok}"
        assert blocked, "Free plan limit was not enforced"


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard_stats(self, admin_client):
        r = admin_client.get(f"{API}/dashboard/stats")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["total_sales", "pending_payments", "paid_total", "monthly_revenue",
                  "this_month_revenue", "top_customers", "recent_invoices",
                  "low_stock", "invoice_count", "customer_count", "product_count"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["monthly_revenue"], list)
        assert isinstance(d["recent_invoices"], list)
        assert d["invoice_count"] >= 2


# ---------------- Auth scoping ----------------
class TestOwnerScoping:
    def test_free_user_cannot_see_admin_customers(self, free_client, admin_client):
        # admin creates a customer
        c = admin_client.post(f"{API}/customers", json={"name": "TEST AdminOnly", "state": "Karnataka"}).json()
        # free user should not see it
        listing = free_client.get(f"{API}/customers").json()
        assert all(x["id"] != c["id"] for x in listing)


# ---------------- cleanup ----------------
@pytest.fixture(scope="session", autouse=True)
def _cleanup_at_end():
    yield
    try:
        admin = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10).json()
        h = {"Authorization": f"Bearer {admin['token']}"}
        for c in requests.get(f"{API}/customers", headers=h).json():
            if c.get("name", "").startswith("TEST"):
                requests.delete(f"{API}/customers/{c['id']}", headers=h)
        for p in requests.get(f"{API}/products", headers=h).json():
            if p.get("name", "").startswith("TEST"):
                requests.delete(f"{API}/products/{p['id']}", headers=h)
    except Exception:
        pass
