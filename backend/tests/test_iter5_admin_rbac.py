"""Iteration 5: Admin RBAC + ownership security + admin endpoints + unit field."""
import os
import uuid
import requests
import pytest
from pathlib import Path

def _load_backend_url():
    v = os.environ.get('REACT_APP_BACKEND_URL', '').strip()
    if v:
        return v.rstrip('/')
    env = Path('/app/frontend/.env')
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.split('=', 1)[1].strip().rstrip('/')
    raise RuntimeError('REACT_APP_BACKEND_URL not set')

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@iipbilling.com"
ADMIN_PASSWORD = "Admin@123"


def _register(name, email, password="Test@123", company_name=None):
    r = requests.post(f"{API}/auth/register", json={
        "name": name, "email": email, "password": password,
        "company_name": company_name,
    })
    return r


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    return r


def _headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def two_users():
    """Register two throwaway users A and B, each with a customer + invoice."""
    ea = f"user_a_{uuid.uuid4().hex[:8]}_sec@test.com"
    eb = f"user_b_{uuid.uuid4().hex[:8]}_sec@test.com"
    ra = _register("TEST_UserA", ea, company_name="TEST_CompA")
    rb = _register("TEST_UserB", eb, company_name="TEST_CompB")
    assert ra.status_code == 200 and rb.status_code == 200
    ta = ra.json()["token"]
    tb = rb.json()["token"]

    # A: customer + invoice
    ca = requests.post(f"{API}/customers", headers=_headers(ta), json={
        "name": "TEST_CustA", "state": "Karnataka", "gstin": "29ABCDE1234F1Z5"
    }).json()
    da = requests.post(f"{API}/documents", headers=_headers(ta), json={
        "type": "invoice", "customer_id": ca["id"],
        "items": [{"name": "IteA", "qty": 1, "rate": 1000, "gst_rate": 18, "unit": "NOS"}],
    })
    assert da.status_code == 200, da.text
    doc_a = da.json()

    # B: customer + invoice
    cb = requests.post(f"{API}/customers", headers=_headers(tb), json={
        "name": "TEST_CustB", "state": "Maharashtra"
    }).json()
    db = requests.post(f"{API}/documents", headers=_headers(tb), json={
        "type": "invoice", "customer_id": cb["id"],
        "items": [{"name": "IteB", "qty": 2, "rate": 500, "gst_rate": 18, "unit": "KGS"}],
    })
    assert db.status_code == 200, db.text
    doc_b = db.json()

    yield {"a": {"email": ea, "token": ta, "doc": doc_a, "cust": ca},
           "b": {"email": eb, "token": tb, "doc": doc_b, "cust": cb}}


# ============================================================
# SECURITY: ownership / cross-user isolation
# ============================================================
class TestOwnershipSecurity:
    def test_A_cannot_get_B_document(self, two_users):
        a, b = two_users["a"], two_users["b"]
        r = requests.get(f"{API}/documents/{b['doc']['id']}", headers=_headers(a["token"]))
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"

    def test_A_cannot_update_B_document(self, two_users):
        a, b = two_users["a"], two_users["b"]
        payload = {"type": "invoice", "items": [{"name": "hack", "qty": 1, "rate": 1}]}
        r = requests.put(f"{API}/documents/{b['doc']['id']}", headers=_headers(a["token"]), json=payload)
        assert r.status_code == 404
        # confirm B's doc unchanged
        r2 = requests.get(f"{API}/documents/{b['doc']['id']}", headers=_headers(b["token"]))
        assert r2.status_code == 200
        assert r2.json()["items"][0]["name"] == "IteB"

    def test_A_delete_B_document_is_noop(self, two_users):
        a, b = two_users["a"], two_users["b"]
        r = requests.delete(f"{API}/documents/{b['doc']['id']}", headers=_headers(a["token"]))
        # backend returns generic 200 message even on no-op (documented behaviour); doc must still exist
        r2 = requests.get(f"{API}/documents/{b['doc']['id']}", headers=_headers(b["token"]))
        assert r2.status_code == 200, "B's document must still exist"

    def test_documents_list_is_owner_scoped(self, two_users):
        a, b = two_users["a"], two_users["b"]
        la = requests.get(f"{API}/documents", headers=_headers(a["token"])).json()
        lb = requests.get(f"{API}/documents", headers=_headers(b["token"])).json()
        a_ids = {d["id"] for d in la}
        b_ids = {d["id"] for d in lb}
        assert two_users["a"]["doc"]["id"] in a_ids
        assert two_users["b"]["doc"]["id"] in b_ids
        assert two_users["b"]["doc"]["id"] not in a_ids
        assert two_users["a"]["doc"]["id"] not in b_ids

    def test_customers_list_is_owner_scoped(self, two_users):
        a, b = two_users["a"], two_users["b"]
        la = requests.get(f"{API}/customers", headers=_headers(a["token"])).json()
        b_cust_id = two_users["b"]["cust"]["id"]
        assert all(c["id"] != b_cust_id for c in la)

    def test_products_list_is_owner_scoped(self, two_users):
        # create a product under A
        a = two_users["a"]
        p = requests.post(f"{API}/products", headers=_headers(a["token"]), json={
            "name": "TEST_ProdA", "unit": "NOS", "price": 100
        }).json()
        assert "id" in p
        # B should not see it
        lb = requests.get(f"{API}/products", headers=_headers(two_users["b"]["token"])).json()
        assert all(pr["id"] != p["id"] for pr in lb)


# ============================================================
# SECURITY: admin route access control
# ============================================================
class TestAdminRouteACL:
    endpoints = [
        ("GET", "/admin/stats"),
        ("GET", "/admin/users"),
        ("GET", "/admin/documents"),
        ("GET", "/admin/products"),
        ("GET", "/admin/customers"),
        ("GET", "/admin/payments"),
    ]

    def test_non_admin_forbidden(self, two_users):
        token = two_users["a"]["token"]
        for method, ep in self.endpoints:
            r = requests.request(method, f"{API}{ep}", headers=_headers(token))
            assert r.status_code == 403, f"{ep} expected 403, got {r.status_code}"

    def test_non_admin_forbidden_on_user_detail_and_doc_detail(self, two_users):
        token = two_users["a"]["token"]
        b_doc_id = two_users["b"]["doc"]["id"]
        b_uid = None
        # can't fetch users, but try with a random uuid — should hit require_admin 403 first
        r = requests.get(f"{API}/admin/users/{uuid.uuid4()}", headers=_headers(token))
        assert r.status_code == 403
        r = requests.get(f"{API}/admin/documents/{b_doc_id}", headers=_headers(token))
        assert r.status_code == 403
        r = requests.patch(f"{API}/admin/users/{uuid.uuid4()}/plan",
                           headers=_headers(token), json={"plan": "pro"})
        assert r.status_code == 403
        r = requests.delete(f"{API}/admin/users/{uuid.uuid4()}", headers=_headers(token))
        assert r.status_code == 403


# ============================================================
# ADMIN endpoints
# ============================================================
class TestAdminEndpoints:
    def test_stats_shape(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_headers(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("total_users", "total_documents", "total_sales",
                  "subscription_revenue", "mrr", "plan_distribution"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["total_users"], int) and d["total_users"] >= 1
        assert isinstance(d["total_sales"], (int, float))

    def test_users_list(self, admin_token, two_users):
        r = requests.get(f"{API}/admin/users", headers=_headers(admin_token))
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert two_users["a"]["email"] in emails
        assert two_users["b"]["email"] in emails
        # no password_hash leaked
        assert all("password_hash" not in u for u in r.json())

    def test_admin_can_fetch_any_document_detail(self, admin_token, two_users):
        b_doc_id = two_users["b"]["doc"]["id"]
        r = requests.get(f"{API}/admin/documents/{b_doc_id}", headers=_headers(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["document"]["id"] == b_doc_id
        assert "company" in body and "owner" in body

    def test_admin_documents_filters(self, admin_token, two_users):
        # by type
        r = requests.get(f"{API}/admin/documents?type=invoice", headers=_headers(admin_token))
        assert r.status_code == 200
        docs = r.json()
        assert all(d["type"] == "invoice" for d in docs)
        # search by customer name (TEST_CustB unique)
        r = requests.get(f"{API}/admin/documents?q=TEST_CustB", headers=_headers(admin_token))
        assert r.status_code == 200
        results = r.json()
        assert len(results) >= 1
        assert any(d["id"] == two_users["b"]["doc"]["id"] for d in results)
        # each result carries owner_email / company_name
        assert all("owner_email" in d for d in results)

    def test_admin_user_detail(self, admin_token, two_users):
        # find user A id
        users = requests.get(f"{API}/admin/users", headers=_headers(admin_token)).json()
        ua = next(u for u in users if u["email"] == two_users["a"]["email"])
        r = requests.get(f"{API}/admin/users/{ua['id']}", headers=_headers(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == two_users["a"]["email"]
        assert d["company"]["name"] == "TEST_CompA"
        assert d["counts"]["invoices"] >= 1

    def test_admin_update_user_plan(self, admin_token, two_users):
        users = requests.get(f"{API}/admin/users", headers=_headers(admin_token)).json()
        ua = next(u for u in users if u["email"] == two_users["a"]["email"])
        r = requests.patch(f"{API}/admin/users/{ua['id']}/plan",
                           headers=_headers(admin_token), json={"plan": "pro"})
        assert r.status_code == 200
        u2 = next(u for u in requests.get(f"{API}/admin/users", headers=_headers(admin_token)).json()
                  if u["email"] == two_users["a"]["email"])
        assert u2["plan"] == "pro"

    def test_admin_cannot_delete_admin(self, admin_token):
        users = requests.get(f"{API}/admin/users", headers=_headers(admin_token)).json()
        admin = next(u for u in users if u["email"] == ADMIN_EMAIL)
        r = requests.delete(f"{API}/admin/users/{admin['id']}", headers=_headers(admin_token))
        assert r.status_code == 400

    def test_admin_products_and_customers_include_company(self, admin_token):
        rp = requests.get(f"{API}/admin/products", headers=_headers(admin_token))
        rc = requests.get(f"{API}/admin/customers", headers=_headers(admin_token))
        assert rp.status_code == 200 and rc.status_code == 200
        # at least one row with a company_name key present
        assert all("company_name" in p for p in rp.json())
        assert all("company_name" in c for c in rc.json())


# ============================================================
# UNIT field on LineItem
# ============================================================
class TestUnitField:
    def test_line_item_unit_persists(self, two_users):
        a = two_users["a"]
        r = requests.post(f"{API}/documents", headers=_headers(a["token"]), json={
            "type": "quotation",
            "items": [{"name": "widget", "qty": 3, "rate": 100, "gst_rate": 18, "unit": "BOX"}],
        })
        assert r.status_code == 200
        doc = r.json()
        assert doc["items"][0]["unit"] == "BOX"
        # re-fetch to confirm persistence
        r2 = requests.get(f"{API}/documents/{doc['id']}", headers=_headers(a["token"]))
        assert r2.json()["items"][0]["unit"] == "BOX"

    def test_product_unit_persists(self, two_users):
        a = two_users["a"]
        r = requests.post(f"{API}/products", headers=_headers(a["token"]), json={
            "name": "TEST_UnitProd", "unit": "PCS", "price": 50, "gst_rate": 18
        })
        assert r.status_code == 200
        assert r.json()["unit"] == "PCS"


# ============================================================
# Cleanup — delete throwaway users at module teardown
# ============================================================
@pytest.fixture(scope="module", autouse=True)
def _cleanup(admin_token, two_users):
    yield
    try:
        users = requests.get(f"{API}/admin/users", headers=_headers(admin_token)).json()
        for u in users:
            if u["email"].endswith("_sec@test.com"):
                requests.delete(f"{API}/admin/users/{u['id']}", headers=_headers(admin_token))
    except Exception:
        pass
