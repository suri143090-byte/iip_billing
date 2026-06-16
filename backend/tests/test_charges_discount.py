"""Tests for iteration 3: per-item description, discount modes (percent/amount),
additional charges with GST, and that the same engine works across all 6 doc types."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
API = f"{BASE_URL.rstrip('/')}/api"

ADMIN_EMAIL = "admin@iipbilling.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def admin_client():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mh_customer(admin_client):
    """Inter-state customer (Maharashtra)."""
    r = admin_client.post(f"{API}/customers", json={
        "name": f"TEST IT3 MH {uuid.uuid4().hex[:6]}",
        "state": "Maharashtra", "type": "customer",
    })
    assert r.status_code == 200
    return r.json()


# ---------------- Core calc: percent-mode + Freight (intra) ----------------
class TestPercentModeWithFreight:
    """Spec: {qty1,rate1000,discount10,gst18} + Freight{200,18%} intra (KA, no customer)
       -> subtotal 900, charges_total 200, total_discount 100, cgst 99, sgst 99, total 1298"""

    def test_invoice_percent_mode_with_freight(self, admin_client):
        payload = {
            "type": "invoice",
            "customer_id": None,
            "items": [{"name": "Widget", "description": "Heavy duty\nsteel widget",
                       "hsn": "8482", "qty": 1, "rate": 1000, "discount": 10, "gst_rate": 18}],
            "discount_mode": "percent",
            "charges": [
                {"label": "Freight", "amount": 200, "gst_rate": 18},
                {"label": "Packing", "amount": 0, "gst_rate": 0},
                {"label": "Loading", "amount": 0, "gst_rate": 0},
                {"label": "Other", "amount": 0, "gst_rate": 0},
            ],
        }
        r = admin_client.post(f"{API}/documents", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_intra_state"] is True
        assert d["subtotal"] == 900.0, f"subtotal={d['subtotal']}"
        assert d["charges_total"] == 200.0
        assert d["total_discount"] == 100.0
        assert d["cgst"] == 99.0, f"cgst={d['cgst']}"
        assert d["sgst"] == 99.0, f"sgst={d['sgst']}"
        assert d["igst"] == 0
        assert d["total"] == 1298.0, f"total={d['total']}"
        # zero-amount charges must be filtered from stored charges
        labels = [c["label"] for c in d["charges"]]
        assert "Freight" in labels
        assert "Packing" not in labels and "Loading" not in labels and "Other" not in labels
        # item enrichment
        it = d["items"][0]
        assert it["description"] == "Heavy duty\nsteel widget"
        assert it["discount_amount"] == 100.0
        assert it["taxable"] == 900.0
        assert it["cgst"] == 81.0 and it["sgst"] == 81.0


# ---------------- Core calc: amount-mode + Packing (inter) ----------------
class TestAmountModeInterstate:
    """Spec: amount-mode {qty1,rate1000,discount:100,gst18} inter (MH) + Packing{50,0%}
       -> taxable 900, igst 162, total 1112"""

    def test_invoice_amount_mode_interstate(self, admin_client, mh_customer):
        payload = {
            "type": "invoice",
            "customer_id": mh_customer["id"],
            "items": [{"name": "Widget", "qty": 1, "rate": 1000, "discount": 100, "gst_rate": 18}],
            "discount_mode": "amount",
            "charges": [{"label": "Packing", "amount": 50, "gst_rate": 0}],
        }
        r = admin_client.post(f"{API}/documents", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_intra_state"] is False
        assert d["subtotal"] == 900.0
        assert d["charges_total"] == 50.0
        assert d["total_discount"] == 100.0
        assert d["cgst"] == 0 and d["sgst"] == 0
        assert d["igst"] == 162.0, f"igst={d['igst']}"
        # total = subtotal (taxable) + charges_total + tax = 900 + 50 + 162 = 1112
        assert d["total"] == 1112.0, f"total={d['total']}"


# ---------------- Discount-mode and charges across ALL 6 document types ----------------
DOC_TYPES = ["invoice", "quotation", "proforma", "purchase_order", "delivery_challan", "credit_note"]
PREFIX = {"invoice": "INV", "quotation": "QUO", "proforma": "PRO",
          "purchase_order": "PO", "delivery_challan": "DC", "credit_note": "CN"}


@pytest.mark.parametrize("dtype", DOC_TYPES)
def test_all_doc_types_support_description_discount_charges(admin_client, dtype):
    payload = {
        "type": dtype,
        "items": [{"name": "X", "description": f"line1 desc for {dtype}\nline2",
                   "qty": 1, "rate": 1000, "discount": 10, "gst_rate": 18}],
        "discount_mode": "percent",
        "charges": [{"label": "Freight", "amount": 200, "gst_rate": 18}],
    }
    r = admin_client.post(f"{API}/documents", json=payload)
    assert r.status_code == 200, f"{dtype}: {r.text}"
    d = r.json()
    assert d["type"] == dtype
    assert d["number"].startswith(PREFIX[dtype] + "/")
    assert d["subtotal"] == 900.0
    assert d["charges_total"] == 200.0
    assert d["total_discount"] == 100.0
    assert d["total"] == 1298.0
    assert d["items"][0]["description"].startswith("line1 desc")
    assert d["discount_mode"] == "percent"
    assert len(d["charges"]) == 1


# ---------------- Edit: pre-populated fields persist ----------------
class TestEditPreservesNewFields:
    def test_edit_preserves_description_discount_mode_and_charges(self, admin_client):
        create = admin_client.post(f"{API}/documents", json={
            "type": "quotation",
            "items": [{"name": "A", "description": "orig desc",
                       "qty": 2, "rate": 500, "discount": 50, "gst_rate": 18}],
            "discount_mode": "amount",
            "charges": [{"label": "Loading", "amount": 30, "gst_rate": 18}],
        }).json()
        did = create["id"]
        # fetch
        got = admin_client.get(f"{API}/documents/{did}").json()
        assert got["discount_mode"] == "amount"
        assert got["items"][0]["description"] == "orig desc"
        assert any(c["label"] == "Loading" for c in got["charges"])

        # edit: change description and add Other charge
        upd_payload = {
            "type": "quotation",
            "items": [{"name": "A", "description": "updated desc",
                       "qty": 2, "rate": 500, "discount": 50, "gst_rate": 18}],
            "discount_mode": "amount",
            "charges": [
                {"label": "Loading", "amount": 30, "gst_rate": 18},
                {"label": "Other", "amount": 70, "gst_rate": 0},
            ],
        }
        r = admin_client.put(f"{API}/documents/{did}", json=upd_payload)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["items"][0]["description"] == "updated desc"
        assert u["charges_total"] == 100.0
        assert any(c["label"] == "Other" for c in u["charges"])


# ---------------- Regression: GST detection still works ----------------
class TestGstRegression:
    def test_intra_state_default_no_customer(self, admin_client):
        # No customer -> intra-state assumed (company KA)
        r = admin_client.post(f"{API}/documents", json={
            "type": "invoice",
            "items": [{"name": "X", "qty": 1, "rate": 100, "gst_rate": 18}],
        })
        assert r.status_code == 200
        d = r.json()
        assert d["is_intra_state"] is True
        assert d["cgst"] == 9.0 and d["sgst"] == 9.0

    def test_zero_amount_charges_are_skipped(self, admin_client):
        r = admin_client.post(f"{API}/documents", json={
            "type": "invoice",
            "items": [{"name": "X", "qty": 1, "rate": 100, "gst_rate": 0}],
            "charges": [
                {"label": "Freight", "amount": 0, "gst_rate": 18},
                {"label": "Packing", "amount": 0, "gst_rate": 18},
            ],
        })
        assert r.status_code == 200
        assert r.json()["charges"] == []
        assert r.json()["charges_total"] == 0.0
