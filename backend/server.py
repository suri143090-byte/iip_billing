from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta

# ----------------------------------------------------------------------------
# DB / App setup
# ----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="IIP Billing Pro API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def clean(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
        doc.pop("password_hash", None)
    return doc


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean(user)


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class Customer(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    gstin: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    billing_address: Optional[str] = ""
    shipping_address: Optional[str] = ""
    state: Optional[str] = ""
    type: Optional[str] = "customer"  # customer | supplier


class Product(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    hsn: Optional[str] = ""
    description: Optional[str] = ""
    unit: Optional[str] = "Nos"
    price: float = 0.0
    gst_rate: float = 18.0
    stock: float = 0.0
    low_stock_threshold: float = 5.0


class LineItem(BaseModel):
    product_id: Optional[str] = None
    name: str
    hsn: Optional[str] = ""
    qty: float = 1.0
    rate: float = 0.0
    gst_rate: float = 18.0


class DocumentInput(BaseModel):
    type: str = "invoice"  # invoice | quotation | proforma
    customer_id: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    items: List[LineItem] = []
    discount: float = 0.0
    notes: Optional[str] = ""
    terms: Optional[str] = ""
    status: Optional[str] = "unpaid"  # unpaid | paid | partial
    template: Optional[str] = "classic"
    amount_paid: float = 0.0


class CompanySettings(BaseModel):
    name: str = "Indian Industrial Products"
    gstin: Optional[str] = ""
    address: Optional[str] = ""
    state: Optional[str] = "Karnataka"
    phone: Optional[str] = "9380036328"
    email: Optional[str] = "indianindustrialproducts25@gmail.com"
    website: Optional[str] = "www.indianindustrialproducts.com"
    logo_url: Optional[str] = ""
    bank_name: Optional[str] = ""
    account_number: Optional[str] = ""
    ifsc: Optional[str] = ""
    upi_id: Optional[str] = ""
    signature_url: Optional[str] = ""
    default_template: Optional[str] = "classic"


# ----------------------------------------------------------------------------
# Totals computation
# ----------------------------------------------------------------------------
def compute_totals(items, company_state, customer_state, discount=0.0):
    subtotal = 0.0
    intra = True
    if customer_state and company_state:
        intra = customer_state.strip().lower() == company_state.strip().lower()
    cgst = sgst = igst = 0.0
    computed_items = []
    for it in items:
        qty = float(it.get("qty", 0) or 0)
        rate = float(it.get("rate", 0) or 0)
        gst_rate = float(it.get("gst_rate", 0) or 0)
        taxable = round(qty * rate, 2)
        tax = round(taxable * gst_rate / 100.0, 2)
        subtotal += taxable
        if intra:
            cgst += tax / 2.0
            sgst += tax / 2.0
        else:
            igst += tax
        ci = dict(it)
        ci["taxable"] = taxable
        ci["tax"] = tax
        ci["amount"] = round(taxable + tax, 2)
        computed_items.append(ci)
    subtotal = round(subtotal, 2)
    cgst = round(cgst, 2)
    sgst = round(sgst, 2)
    igst = round(igst, 2)
    total_tax = round(cgst + sgst + igst, 2)
    total = round(subtotal - float(discount or 0) + total_tax, 2)
    return {
        "items": computed_items,
        "subtotal": subtotal,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "total_tax": total_tax,
        "total": total,
        "is_intra_state": intra,
    }


async def get_company(uid: str) -> dict:
    comp = await db.companies.find_one({"owner_id": uid})
    if not comp:
        defaults = CompanySettings().model_dump()
        defaults["owner_id"] = uid
        await db.companies.insert_one(dict(defaults))
        comp = defaults
    return clean(comp)


async def gen_doc_number(uid: str, dtype: str) -> str:
    prefix = {"invoice": "INV", "quotation": "QUO", "proforma": "PRO"}.get(dtype, "DOC")
    year = datetime.now(timezone.utc).year
    # Monotonic per owner+type counter (never reused even if a doc is deleted)
    res = await db.counters.find_one_and_update(
        {"owner_id": uid, "type": dtype},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = res["seq"] if res and res.get("seq") else 1
    return f"{prefix}/{year}/{seq:04d}"


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(payload: RegisterInput):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    user = {
        "id": uid,
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "plan": "free",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    comp = CompanySettings().model_dump()
    comp["owner_id"] = uid
    if payload.company_name:
        comp["name"] = payload.company_name
    await db.companies.insert_one(dict(comp))
    token = create_access_token(uid, email)
    return {"token": token, "user": clean(dict(user))}


@api_router.post("/auth/login")
async def login(payload: LoginInput):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    return {"token": token, "user": clean(dict(user))}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out"}


# ----------------------------------------------------------------------------
# Company routes
# ----------------------------------------------------------------------------
@api_router.get("/company")
async def company_get(user: dict = Depends(get_current_user)):
    return await get_company(user["id"])


@api_router.put("/company")
async def company_put(payload: CompanySettings, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    await db.companies.update_one({"owner_id": user["id"]}, {"$set": data}, upsert=True)
    return await get_company(user["id"])


# ----------------------------------------------------------------------------
# Customers / Suppliers (parties)
# ----------------------------------------------------------------------------
@api_router.get("/customers")
async def customers_list(type: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if type:
        q["type"] = type
    docs = await db.customers.find(q, {"_id": 0, "owner_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/customers")
async def customers_create(payload: Customer, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["owner_id"] = user["id"]
    await db.customers.insert_one(dict(data))
    data.pop("owner_id", None)
    return data


@api_router.put("/customers/{cid}")
async def customers_update(cid: str, payload: Customer, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["id"] = cid
    await db.customers.update_one({"id": cid, "owner_id": user["id"]}, {"$set": data})
    return data


@api_router.delete("/customers/{cid}")
async def customers_delete(cid: str, user: dict = Depends(get_current_user)):
    await db.customers.delete_one({"id": cid, "owner_id": user["id"]})
    return {"message": "deleted"}


# ----------------------------------------------------------------------------
# Products
# ----------------------------------------------------------------------------
@api_router.get("/products")
async def products_list(user: dict = Depends(get_current_user)):
    docs = await db.products.find({"owner_id": user["id"]}, {"_id": 0, "owner_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/products")
async def products_create(payload: Product, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["owner_id"] = user["id"]
    await db.products.insert_one(dict(data))
    data.pop("owner_id", None)
    return data


@api_router.put("/products/{pid}")
async def products_update(pid: str, payload: Product, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["id"] = pid
    await db.products.update_one({"id": pid, "owner_id": user["id"]}, {"$set": data})
    return data


@api_router.delete("/products/{pid}")
async def products_delete(pid: str, user: dict = Depends(get_current_user)):
    await db.products.delete_one({"id": pid, "owner_id": user["id"]})
    return {"message": "deleted"}


# ----------------------------------------------------------------------------
# Documents (invoices / quotations / proforma)
# ----------------------------------------------------------------------------
async def build_document(payload: DocumentInput, user: dict, doc_id=None, number=None):
    comp = await get_company(user["id"])
    customer = None
    if payload.customer_id:
        customer = await db.customers.find_one({"id": payload.customer_id, "owner_id": user["id"]}, {"_id": 0, "owner_id": 0})
    cust_state = customer.get("state") if customer else ""
    items = [i.model_dump() for i in payload.items]
    totals = compute_totals(items, comp.get("state"), cust_state, payload.discount)
    doc = {
        "id": doc_id or new_id(),
        "owner_id": user["id"],
        "number": number,
        "type": payload.type,
        "customer_id": payload.customer_id,
        "customer": customer,
        "date": payload.date or now_iso()[:10],
        "due_date": payload.due_date,
        "items": totals["items"],
        "discount": payload.discount,
        "subtotal": totals["subtotal"],
        "cgst": totals["cgst"],
        "sgst": totals["sgst"],
        "igst": totals["igst"],
        "total_tax": totals["total_tax"],
        "total": totals["total"],
        "is_intra_state": totals["is_intra_state"],
        "notes": payload.notes,
        "terms": payload.terms,
        "status": payload.status,
        "amount_paid": payload.amount_paid,
        "template": payload.template,
        "updated_at": now_iso(),
    }
    return doc


@api_router.get("/documents")
async def documents_list(type: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]}
    if type:
        q["type"] = type
    docs = await db.documents.find(q, {"_id": 0, "owner_id": 0}).sort("updated_at", -1).to_list(2000)
    return docs


@api_router.post("/documents")
async def documents_create(payload: DocumentInput, user: dict = Depends(get_current_user)):
    # Free plan: limit 10 invoices / month
    if payload.type == "invoice":
        full_user = await db.users.find_one({"id": user["id"]})
        if full_user.get("plan", "free") == "free":
            month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            cnt = await db.documents.count_documents({
                "owner_id": user["id"], "type": "invoice",
                "created_at": {"$gte": month_start.isoformat()},
            })
            if cnt >= 10:
                raise HTTPException(status_code=403, detail="Free plan limit reached: 10 invoices per month. Upgrade to Pro for unlimited invoices.")
    number = await gen_doc_number(user["id"], payload.type)
    doc = await build_document(payload, user, number=number)
    doc["created_at"] = now_iso()
    await db.documents.insert_one(dict(doc))
    # decrement stock for invoices
    if payload.type == "invoice":
        for it in doc["items"]:
            if it.get("product_id"):
                await db.products.update_one(
                    {"id": it["product_id"], "owner_id": user["id"]},
                    {"$inc": {"stock": -float(it.get("qty", 0) or 0)}},
                )
    doc.pop("owner_id", None)
    return doc


@api_router.get("/documents/{did}")
async def documents_get(did: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": did, "owner_id": user["id"]}, {"_id": 0, "owner_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@api_router.put("/documents/{did}")
async def documents_update(did: str, payload: DocumentInput, user: dict = Depends(get_current_user)):
    existing = await db.documents.find_one({"id": did, "owner_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = await build_document(payload, user, doc_id=did, number=existing.get("number"))
    await db.documents.update_one({"id": did, "owner_id": user["id"]}, {"$set": doc})
    doc.pop("owner_id", None)
    return doc


@api_router.patch("/documents/{did}/status")
async def documents_status(did: str, body: dict, user: dict = Depends(get_current_user)):
    status = body.get("status")
    await db.documents.update_one({"id": did, "owner_id": user["id"]}, {"$set": {"status": status}})
    return {"message": "updated", "status": status}


@api_router.delete("/documents/{did}")
async def documents_delete(did: str, user: dict = Depends(get_current_user)):
    await db.documents.delete_one({"id": did, "owner_id": user["id"]})
    return {"message": "deleted"}


# ----------------------------------------------------------------------------
# Dashboard
# ----------------------------------------------------------------------------
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    uid = user["id"]
    invoices = await db.documents.find({"owner_id": uid, "type": "invoice"}, {"_id": 0, "owner_id": 0}).to_list(5000)
    total_sales = round(sum(i.get("total", 0) for i in invoices), 2)
    pending = round(sum((i.get("total", 0) - i.get("amount_paid", 0)) for i in invoices if i.get("status") != "paid"), 2)
    paid_total = round(sum(i.get("total", 0) for i in invoices if i.get("status") == "paid"), 2)

    # monthly revenue (last 6 months)
    months = {}
    now = datetime.now(timezone.utc)
    for k in range(5, -1, -1):
        m = (now.replace(day=1) - timedelta(days=30 * k))
        key = m.strftime("%Y-%m")
        months[key] = {"month": m.strftime("%b"), "revenue": 0.0}
    for i in invoices:
        d = (i.get("date") or "")[:7]
        if d in months:
            months[d]["revenue"] += i.get("total", 0)
    monthly_revenue = list(months.values())

    # top customers
    cust_totals = {}
    for i in invoices:
        c = i.get("customer") or {}
        name = c.get("name", "Walk-in")
        cust_totals[name] = cust_totals.get(name, 0) + i.get("total", 0)
    top_customers = sorted(
        [{"name": k, "total": round(v, 2)} for k, v in cust_totals.items()],
        key=lambda x: x["total"], reverse=True,
    )[:5]

    recent = sorted(invoices, key=lambda x: x.get("updated_at", ""), reverse=True)[:5]

    products = await db.products.find({"owner_id": uid}, {"_id": 0, "owner_id": 0}).to_list(2000)
    low_stock = [p for p in products if p.get("stock", 0) <= p.get("low_stock_threshold", 0)][:10]

    invoice_count = len(invoices)
    return {
        "total_sales": total_sales,
        "pending_payments": pending,
        "paid_total": paid_total,
        "monthly_revenue": monthly_revenue,
        "this_month_revenue": round(monthly_revenue[-1]["revenue"], 2) if monthly_revenue else 0,
        "top_customers": top_customers,
        "recent_invoices": recent,
        "low_stock": low_stock,
        "invoice_count": invoice_count,
        "customer_count": await db.customers.count_documents({"owner_id": uid}),
        "product_count": len(products),
    }


# ----------------------------------------------------------------------------
# Startup
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "IIP Billing Pro API"}


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@iipbilling.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        uid = new_id()
        await db.users.insert_one({
            "id": uid, "name": "IIP Admin", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "admin",
            "plan": "premium", "created_at": now_iso(),
        })
        comp = CompanySettings().model_dump()
        comp["owner_id"] = uid
        await db.companies.insert_one(dict(comp))
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id")
    await db.documents.create_index("owner_id")
    await db.customers.create_index("owner_id")
    await db.products.create_index("owner_id")
    await seed_admin()
    logger.info("IIP Billing Pro API started")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
