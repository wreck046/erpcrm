from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from dotenv import load_dotenv
from pathlib import Path
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# ============= RATE LIMITING (THROTTLING) =============
def get_user_id_or_ip(request: Request) -> str:
    """Per-user rate limit key. Falls back to IP if not authenticated."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except jwt.InvalidTokenError:
            pass
    return f"ip:{get_remote_address(request)}"

limiter = Limiter(key_func=get_user_id_or_ip, headers_enabled=False)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")

# ============= PASSWORD HASHING =============
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ============= JWT TOKEN MANAGEMENT =============
def create_access_token(user_id: str, email: str, organization_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "organization_id": organization_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ============= AUTH HELPER =============
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= RBAC MIDDLEWARE =============
def require_role(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ============= MODELS =============
class OrganizationCreate(BaseModel):
    name: str

class Organization(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    created_at: datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    organization_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    organization_id: str
    created_at: datetime

class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    phone: Optional[str] = None
    status: str = "new"
    value: Optional[float] = None
    notes: Optional[str] = None

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    status: str
    value: Optional[float] = None
    notes: Optional[str] = None
    organization_id: str
    owner_id: str
    created_at: datetime

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None
    organization_id: str
    created_at: datetime

class DealCreate(BaseModel):
    title: str
    value: float
    stage: str
    contact_id: Optional[str] = None
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None

class Deal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    value: float
    stage: str
    contact_id: Optional[str] = None
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None
    organization_id: str
    owner_id: str
    created_at: datetime

class DealUpdate(BaseModel):
    stage: str

class InventoryItemCreate(BaseModel):
    name: str
    sku: str
    quantity: int
    unit_price: float
    category: Optional[str] = None
    description: Optional[str] = None

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    sku: str
    quantity: int
    unit_price: float
    category: Optional[str] = None
    description: Optional[str] = None
    organization_id: str
    created_at: datetime

class InvoiceItemModel(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    items: List[InvoiceItemModel]
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    invoice_number: str
    client_name: str
    client_email: str
    items: List[InvoiceItemModel]
    subtotal: float
    tax: float
    total: float
    status: str
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    organization_id: str
    created_at: datetime

class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    items: List[InvoiceItemModel]
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    po_number: str
    supplier_id: str
    items: List[InvoiceItemModel]
    subtotal: float
    tax: float
    total: float
    status: str
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    organization_id: str
    created_at: datetime

class SupplierCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    organization_id: str
    created_at: datetime

class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    content: str
    recipient_type: str  # "leads", "contacts", "custom"
    recipient_emails: Optional[List[str]] = None

class EmailCampaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    subject: str
    content: str
    recipient_type: str
    recipient_emails: Optional[List[str]] = None
    status: str  # "draft", "scheduled", "sent"
    sent_count: int = 0
    organization_id: str
    created_at: datetime

class PaymentCheckoutRequest(BaseModel):
    amount: float
    description: str
    origin_url: str

class DashboardStats(BaseModel):
    total_leads: int
    total_contacts: int
    total_deals: int
    total_deal_value: float
    total_inventory_value: float
    pending_invoices: int
    pending_pos: int

# ============= ADMIN SEEDING =============
async def seed_admin():
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@erp-crm.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    
    # Create default organization
    org = await db.organizations.find_one({"name": "Default Organization"})
    if not org:
        org_doc = {
            "name": "Default Organization",
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.organizations.insert_one(org_doc)
        org_id = str(result.inserted_id)
    else:
        org_id = str(org["_id"])
    
    # Seed admin user
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin User",
            "role": "admin",
            "organization_id": org_id,
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    
    # Seed default pipeline stages
    stages = await db.stages.find_one({"organization_id": org_id})
    if not stages:
        default_stages = [
            {"name": "Lead", "order": 0, "organization_id": org_id},
            {"name": "Qualified", "order": 1, "organization_id": org_id},
            {"name": "Proposal", "order": 2, "organization_id": org_id},
            {"name": "Negotiation", "order": 3, "organization_id": org_id},
            {"name": "Closed Won", "order": 4, "organization_id": org_id},
        ]
        await db.stages.insert_many(default_stages)
    
    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n")
        f.write(f"- POST /api/auth/register\n")
        f.write(f"- POST /api/auth/login\n")
        f.write(f"- GET /api/auth/me\n")
        f.write(f"- POST /api/auth/logout\n")

# ============= STARTUP =============
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.organizations.create_index("name")
    await seed_admin()
    logger.info("Database indexes created and admin seeded")

# ============= AUTH ROUTES =============
@api_router.post("/auth/register", response_model=User)
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create organization
    org_doc = {
        "name": user_data.organization_name,
        "created_at": datetime.now(timezone.utc)
    }
    org_result = await db.organizations.insert_one(org_doc)
    org_id = str(org_result.inserted_id)
    
    # Create user
    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "admin",  # First user is admin of their org
        "organization_id": org_id,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create default pipeline stages for new org
    default_stages = [
        {"name": "Lead", "order": 0, "organization_id": org_id},
        {"name": "Qualified", "order": 1, "organization_id": org_id},
        {"name": "Proposal", "order": 2, "organization_id": org_id},
        {"name": "Negotiation", "order": 3, "organization_id": org_id},
        {"name": "Closed Won", "order": 4, "organization_id": org_id},
    ]
    await db.stages.insert_many(default_stages)
    
    # Create token and set cookie
    token = create_access_token(user_id, email, org_id, "admin")
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    return User(
        id=user_id,
        email=email,
        name=user_data.name,
        role="admin",
        organization_id=org_id,
        created_at=datetime.now(timezone.utc)
    )

@api_router.post("/auth/login", response_model=User)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, response: Response):
    email = credentials.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    token = create_access_token(
        user_id,
        email,
        user["organization_id"],
        user["role"]
    )
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    return User(
        id=user_id,
        email=email,
        name=user["name"],
        role=user["role"],
        organization_id=user["organization_id"],
        created_at=user["created_at"]
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    return User(**user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}

# ============= DASHBOARD ROUTES =============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    org_id = user["organization_id"]
    
    total_leads = await db.leads.count_documents({"organization_id": org_id})
    total_contacts = await db.contacts.count_documents({"organization_id": org_id})
    total_deals = await db.deals.count_documents({"organization_id": org_id})
    
    deals = await db.deals.find({"organization_id": org_id}, {"_id": 0, "value": 1}).to_list(1000)
    total_deal_value = sum(deal.get("value", 0) for deal in deals)
    
    inventory = await db.inventory.find({"organization_id": org_id}, {"_id": 0, "quantity": 1, "unit_price": 1}).to_list(1000)
    total_inventory_value = sum(item.get("quantity", 0) * item.get("unit_price", 0) for item in inventory)
    
    pending_invoices = await db.invoices.count_documents({"organization_id": org_id, "status": "pending"})
    pending_pos = await db.purchase_orders.count_documents({"organization_id": org_id, "status": "pending"})
    
    return DashboardStats(
        total_leads=total_leads,
        total_contacts=total_contacts,
        total_deals=total_deals,
        total_deal_value=total_deal_value,
        total_inventory_value=total_inventory_value,
        pending_invoices=pending_invoices,
        pending_pos=pending_pos
    )

# ============= CRM ROUTES - LEADS =============
@api_router.post("/crm/leads", response_model=Lead)
@limiter.limit("60/minute")
async def create_lead(request: Request, lead_data: LeadCreate, user: dict = Depends(get_current_user)):
    lead_doc = lead_data.model_dump()
    lead_doc["organization_id"] = user["organization_id"]
    lead_doc["owner_id"] = user["id"]
    lead_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.leads.insert_one(lead_doc)
    lead_doc["id"] = str(result.inserted_id)
    return Lead(**lead_doc)

@api_router.get("/crm/leads", response_model=List[Lead])
async def get_leads(user: dict = Depends(get_current_user)):
    leads = await db.leads.find({"organization_id": user["organization_id"]}).to_list(1000)
    for lead in leads:
        lead["id"] = str(lead.pop("_id"))
    return leads

# ============= CRM ROUTES - CONTACTS =============
@api_router.post("/crm/contacts", response_model=Contact)
@limiter.limit("60/minute")
async def create_contact(request: Request, contact_data: ContactCreate, user: dict = Depends(get_current_user)):
    contact_doc = contact_data.model_dump()
    contact_doc["organization_id"] = user["organization_id"]
    contact_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.contacts.insert_one(contact_doc)
    contact_doc["id"] = str(result.inserted_id)
    return Contact(**contact_doc)

@api_router.get("/crm/contacts", response_model=List[Contact])
async def get_contacts(user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"organization_id": user["organization_id"]}).to_list(1000)
    for contact in contacts:
        contact["id"] = str(contact.pop("_id"))
    return contacts

# ============= CRM ROUTES - DEALS & PIPELINE =============
@api_router.post("/crm/deals", response_model=Deal)
@limiter.limit("60/minute")
async def create_deal(request: Request, deal_data: DealCreate, user: dict = Depends(get_current_user)):
    deal_doc = deal_data.model_dump()
    deal_doc["organization_id"] = user["organization_id"]
    deal_doc["owner_id"] = user["id"]
    deal_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.deals.insert_one(deal_doc)
    deal_doc["id"] = str(result.inserted_id)
    return Deal(**deal_doc)

@api_router.get("/crm/deals", response_model=List[Deal])
async def get_deals(user: dict = Depends(get_current_user)):
    deals = await db.deals.find({"organization_id": user["organization_id"]}).to_list(1000)
    for deal in deals:
        deal["id"] = str(deal.pop("_id"))
    return deals

@api_router.patch("/crm/deals/{deal_id}", response_model=Deal)
@limiter.limit("60/minute")
async def update_deal(request: Request, deal_id: str, update_data: DealUpdate, user: dict = Depends(get_current_user)):
    result = await db.deals.find_one_and_update(
        {"_id": ObjectId(deal_id), "organization_id": user["organization_id"]},
        {"$set": {"stage": update_data.stage}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Deal not found")
    result["id"] = str(result.pop("_id"))
    return Deal(**result)

@api_router.get("/crm/stages")
async def get_stages(user: dict = Depends(get_current_user)):
    stages = await db.stages.find({"organization_id": user["organization_id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    return stages

# ============= ERP ROUTES - INVENTORY =============
@api_router.post("/erp/inventory", response_model=InventoryItem)
@limiter.limit("60/minute")
async def create_inventory_item(request: Request, item_data: InventoryItemCreate, user: dict = Depends(get_current_user)):
    item_doc = item_data.model_dump()
    item_doc["organization_id"] = user["organization_id"]
    item_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.inventory.insert_one(item_doc)
    item_doc["id"] = str(result.inserted_id)
    return InventoryItem(**item_doc)

@api_router.get("/erp/inventory", response_model=List[InventoryItem])
async def get_inventory(user: dict = Depends(get_current_user)):
    items = await db.inventory.find({"organization_id": user["organization_id"]}).to_list(1000)
    for item in items:
        item["id"] = str(item.pop("_id"))
    return items

# ============= ERP ROUTES - INVOICES =============
@api_router.post("/erp/invoices", response_model=Invoice)
@limiter.limit("20/minute")
async def create_invoice(request: Request, invoice_data: InvoiceCreate, user: dict = Depends(get_current_user)):
    subtotal = sum(item.total for item in invoice_data.items)
    tax = subtotal * 0.1  # 10% tax
    total = subtotal + tax
    
    # Generate invoice number
    count = await db.invoices.count_documents({"organization_id": user["organization_id"]})
    invoice_number = f"INV-{count + 1:05d}"
    
    invoice_doc = invoice_data.model_dump()
    invoice_doc["invoice_number"] = invoice_number
    invoice_doc["subtotal"] = subtotal
    invoice_doc["tax"] = tax
    invoice_doc["total"] = total
    invoice_doc["status"] = "pending"
    invoice_doc["organization_id"] = user["organization_id"]
    invoice_doc["created_at"] = datetime.now(timezone.utc)
    
    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["id"] = str(result.inserted_id)
    return Invoice(**invoice_doc)

@api_router.get("/erp/invoices", response_model=List[Invoice])
async def get_invoices(user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find({"organization_id": user["organization_id"]}).to_list(1000)
    for invoice in invoices:
        invoice["id"] = str(invoice.pop("_id"))
    return invoices

# ============= ERP ROUTES - SUPPLIERS =============
@api_router.post("/erp/suppliers", response_model=Supplier)
@limiter.limit("60/minute")
async def create_supplier(request: Request, supplier_data: SupplierCreate, user: dict = Depends(get_current_user)):
    supplier_doc = supplier_data.model_dump()
    supplier_doc["organization_id"] = user["organization_id"]
    supplier_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.suppliers.insert_one(supplier_doc)
    supplier_doc["id"] = str(result.inserted_id)
    return Supplier(**supplier_doc)

@api_router.get("/erp/suppliers", response_model=List[Supplier])
async def get_suppliers(user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({"organization_id": user["organization_id"]}).to_list(1000)
    for supplier in suppliers:
        supplier["id"] = str(supplier.pop("_id"))
    return suppliers

# ============= ERP ROUTES - PURCHASE ORDERS =============
@api_router.post("/erp/purchase-orders", response_model=PurchaseOrder)
@limiter.limit("20/minute")
async def create_purchase_order(request: Request, po_data: PurchaseOrderCreate, user: dict = Depends(get_current_user)):
    subtotal = sum(item.total for item in po_data.items)
    tax = subtotal * 0.1
    total = subtotal + tax
    
    count = await db.purchase_orders.count_documents({"organization_id": user["organization_id"]})
    po_number = f"PO-{count + 1:05d}"
    
    po_doc = po_data.model_dump()
    po_doc["po_number"] = po_number
    po_doc["subtotal"] = subtotal
    po_doc["tax"] = tax
    po_doc["total"] = total
    po_doc["status"] = "pending"
    po_doc["organization_id"] = user["organization_id"]
    po_doc["created_at"] = datetime.now(timezone.utc)
    
    result = await db.purchase_orders.insert_one(po_doc)
    po_doc["id"] = str(result.inserted_id)
    return PurchaseOrder(**po_doc)

@api_router.get("/erp/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(user: dict = Depends(get_current_user)):
    pos = await db.purchase_orders.find({"organization_id": user["organization_id"]}).to_list(1000)
    for po in pos:
        po["id"] = str(po.pop("_id"))
    return pos

# ============= EMAIL CAMPAIGNS =============
@api_router.post("/email/campaigns", response_model=EmailCampaign)
@limiter.limit("60/minute")
async def create_email_campaign(request: Request, campaign_data: EmailCampaignCreate, user: dict = Depends(get_current_user)):
    campaign_doc = campaign_data.model_dump()
    campaign_doc["organization_id"] = user["organization_id"]
    campaign_doc["status"] = "draft"
    campaign_doc["sent_count"] = 0
    campaign_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.email_campaigns.insert_one(campaign_doc)
    campaign_doc["id"] = str(result.inserted_id)
    return EmailCampaign(**campaign_doc)

@api_router.get("/email/campaigns", response_model=List[EmailCampaign])
async def get_email_campaigns(user: dict = Depends(get_current_user)):
    campaigns = await db.email_campaigns.find({"organization_id": user["organization_id"]}).to_list(1000)
    for campaign in campaigns:
        campaign["id"] = str(campaign.pop("_id"))
    return campaigns

# ============= PAYMENT ROUTES =============
@api_router.post("/payments/checkout")
@limiter.limit("5/minute")
async def create_checkout_session(payment_data: PaymentCheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    host_url = payment_data.origin_url
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payments/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/payments"
    
    checkout_request = CheckoutSessionRequest(
        amount=payment_data.amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "organization_id": user["organization_id"],
            "description": payment_data.description
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store transaction
    transaction_doc = {
        "session_id": session.session_id,
        "amount": payment_data.amount,
        "currency": "usd",
        "description": payment_data.description,
        "user_id": user["id"],
        "organization_id": user["organization_id"],
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"payment_status": status.payment_status, "status": status.status}}
    )
    
    return status

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    webhook_response = await stripe_checkout.handle_webhook(body, signature)
    
    # Update transaction based on webhook
    await db.payment_transactions.update_one(
        {"session_id": webhook_response.session_id},
        {"$set": {"payment_status": webhook_response.payment_status}}
    )
    
    return {"status": "success"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
