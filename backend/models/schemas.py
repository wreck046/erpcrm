"""All Pydantic models for the application."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ============= ORGANIZATIONS =============
class OrganizationCreate(BaseModel):
    name: str


class Organization(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    created_at: datetime


# ============= USERS / AUTH =============
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


class UserInviteCreate(BaseModel):
    email: EmailStr
    name: str
    role: str
    mode: str = "invite"
    temp_password: Optional[str] = None


class UserInviteAccept(BaseModel):
    token: str
    password: str


class UserRoleUpdate(BaseModel):
    role: str


class TenantUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    status: str
    created_at: datetime


class InviteInfo(BaseModel):
    email: str
    name: str
    role: str
    organization_name: str
    inviter_name: str
    expires_at: datetime


# ============= CRM =============
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


# ============= ERP =============
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


# ============= EMAIL =============
class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    content: str
    recipient_type: str
    recipient_emails: Optional[List[str]] = None


class EmailCampaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    subject: str
    content: str
    recipient_type: str
    recipient_emails: Optional[List[str]] = None
    status: str
    sent_count: int = 0
    organization_id: str
    created_at: datetime


# ============= PAYMENTS =============
class PaymentCheckoutRequest(BaseModel):
    amount: float
    description: str
    origin_url: str


# ============= DASHBOARD =============
class DashboardStats(BaseModel):
    total_leads: int
    total_contacts: int
    total_deals: int
    total_deal_value: float
    total_inventory_value: float
    pending_invoices: int
    pending_pos: int


# ============= EMAIL CONFIG =============
class EmailConfigStatus(BaseModel):
    enabled: bool
    sender: str
    is_default_sandbox: bool
    note: str
