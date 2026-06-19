"""Iteration 4: place_of_supply on documents + contact_person on customers.

Spec checks:
- Customer model accepts/persists `contact_person` (and `gstin`, `phone`, `email`).
- Document.build_document attaches `place_of_supply = customer.state` (else company.state).
- Intra-state vs inter-state still resolves correctly using company state = Karnataka.
- Spec sample 1: qty 1 * rate 1000 * disc 10% percent-mode + GST 18% => total 1062.
- Spec sample 2: same + Freight 200 GST 18% (intra) => total 1298.
- Spec sample 3: MH inter-state, qty 2 * rate 500 * disc 5% percent + GST 5% => total 998.25... 
  (Spec says ~1121 — actually 2*500=1000, 5% disc=50 -> taxable 950, IGST5%=47.5 -> 997.5).
  Spec wording "₹1121 / IGST" is loose; we just assert IGST-only on MH.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

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
def ka_customer(admin_client):
    payload = {
        "name": f"TEST_iter4_KA_{uuid.uuid4().hex[:6]}",
        "gstin": "29AABCT1234A1Z5",
        "contact_person": "John Doe",
        "phone": "9000000001",
        "email": "ka@x.com",
        "billing_address": "Bangalore Addr",
        "shipping_address": "Bangalore Ship",
        "state": "Karnataka",
        "type": "customer",
    }
    r = admin_client.post(f"{API}/customers", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def mh_customer(admin_client):
    payload = {
        "name": f"TEST_iter4_MH_{uuid.uuid4().hex[:6]}",
        "gstin": "27ABCDE1234F1Z5",
        "contact_person": "Priya M",
        "phone": "9000000002",
        "state": "Maharashtra",
        "type": "customer",
    }
    r = admin_client.post(f"{API}/customers", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


# -------- Customer.contact_person persists --------
class TestCustomerContactPerson:
    def test_create_returns_contact_person(self, ka_customer):
        assert ka_customer["contact_person"] == "John Doe"
        assert ka_customer["gstin"] == "29AABCT1234A1Z5"
        assert ka_customer["phone"] == "9000000001"

    def test_list_returns_contact_person(self, admin_client, ka_customer):
        r = admin_client.get(f"{API}/customers")
        assert r.status_code == 200
        match = [c for c in r.json() if c["id"] == ka_customer["id"]][0]
        assert match["contact_person"] == "John Doe"
        assert match["gstin"] == "29AABCT1234A1Z5"

    def test_update_preserves_contact_person(self, admin_client, ka_customer):
        cid = ka_customer["id"]
        payload = dict(ka_customer)
        payload["contact_person"] = "Updated Person"
        payload["id"] = cid
        r = admin_client.put(f"{API}/customers/{cid}", json=payload)
        assert r.status_code == 200
        listing = admin_client.get(f"{API}/customers").json()
        match = [c for c in listing if c["id"] == cid][0]
        assert match["contact_person"] == "Updated Person"


# -------- Document.place_of_supply --------
class TestPlaceOfSupply:
    def test_intra_state_place_of_supply_equals_customer_state(self, admin_client, ka_customer):
        r = admin_client.post(f"{API}/documents", json={
            "type": "invoice",
            "customer_id": ka_customer["id"],
            "items": [{"name": "Widget", "qty": 1, "rate": 1000, "discount": 10, "gst_rate": 18}],
            "discount_mode": "percent",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["place_of_supply"] == "Karnataka"
        assert d["is_intra_state"] is True
        # 1000 - 100 disc = 900 taxable, 18% = 162 tax -> 1062 total
        assert d["total"] == 1062.0
        assert d["cgst"] == 81.0
        assert d["sgst"] == 81.0
        assert d["igst"] == 0
        assert d["total_discount"] == 100.0

    def test_inter_state_place_of_supply_customer_state(self, admin_client, mh_customer):
        r = admin_client.post(f"{API}/documents", json={
            "type": "invoice",
            "customer_id": mh_customer["id"],
            "items": [{"name": "Widget", "qty": 2, "rate": 500, "discount": 5, "gst_rate": 5}],
            "discount_mode": "percent",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["place_of_supply"] == "Maharashtra"
        assert d["is_intra_state"] is False
        # 2*500=1000; disc 5% = 50; taxable 950; IGST 5% = 47.5; total 997.5
        assert d["igst"] == 47.5
        assert d["cgst"] == 0
        assert d["sgst"] == 0
        assert d["total"] == 997.5

    def test_walkin_place_of_supply_falls_back_to_company_state(self, admin_client):
        # no customer_id => place_of_supply = company state (Karnataka)
        r = admin_client.post(f"{API}/documents", json={
            "type": "invoice",
            "items": [{"name": "Walk-in item", "qty": 1, "rate": 100, "gst_rate": 18}],
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["place_of_supply"] == "Karnataka"
        assert d["is_intra_state"] is True

    def test_place_of_supply_persists_on_get(self, admin_client, ka_customer):
        r = admin_client.post(f"{API}/documents", json={
            "type": "quotation",
            "customer_id": ka_customer["id"],
            "items": [{"name": "Q", "qty": 1, "rate": 100, "gst_rate": 18}],
        })
        did = r.json()["id"]
        g = admin_client.get(f"{API}/documents/{did}").json()
        assert g["place_of_supply"] == "Karnataka"


# -------- Charges with GST: ₹1298 spec --------
class TestChargesIntraTotal:
    def test_intra_freight_18pct_yields_1298(self, admin_client, ka_customer):
        r = admin_client.post(f"{API}/documents", json={
            "type": "invoice",
            "customer_id": ka_customer["id"],
            "items": [{"name": "I1", "qty": 1, "rate": 1000, "discount": 10, "gst_rate": 18}],
            "discount_mode": "percent",
            "charges": [{"label": "Freight", "amount": 200, "gst_rate": 18}],
        })
        assert r.status_code == 200, r.text
        d = r.json()
        # item: 900 taxable + 162 tax = 1062
        # charge: 200 + 36 tax = 236
        # grand: 1298
        assert d["charges_total"] == 200.0
        # CGST = 81 (item) + 18 (charge) = 99 ; SGST same
        assert d["cgst"] == 99.0
        assert d["sgst"] == 99.0
        assert d["igst"] == 0
        assert d["total"] == 1298.0


# -------- Apply across all 6 doc types --------
@pytest.mark.parametrize("dtype,prefix", [
    ("invoice", "INV"),
    ("quotation", "QUO"),
    ("proforma", "PRO"),
    ("purchase_order", "PO"),
    ("delivery_challan", "DC"),
    ("credit_note", "CN"),
])
class TestAllDocTypesPlaceOfSupply:
    def test_creates_with_place_of_supply(self, admin_client, ka_customer, dtype, prefix):
        r = admin_client.post(f"{API}/documents", json={
            "type": dtype,
            "customer_id": ka_customer["id"],
            "items": [{"name": "X", "qty": 1, "rate": 100, "description": "multi\nline", "gst_rate": 18}],
            "charges": [{"label": "Packing", "amount": 50, "gst_rate": 18}],
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == dtype
        assert d["number"].startswith(f"{prefix}/")
        assert d["place_of_supply"] == "Karnataka"
        # description preserved
        assert d["items"][0].get("description") == "multi\nline"
