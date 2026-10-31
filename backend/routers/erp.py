"""ERP routes: inventory, invoices, suppliers, purchase orders."""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, Request

from core.database import db, next_sequence
from core.security import get_current_user
from core.throttle import limiter
from models.schemas import (
    InventoryItem, InventoryItemCreate,
    Invoice, InvoiceCreate,
    Supplier, SupplierCreate,
    PurchaseOrder, PurchaseOrderCreate,
)

router = APIRouter(prefix="/erp", tags=["erp"])


# ============= INVENTORY =============
@router.post("/inventory", response_model=InventoryItem)
@limiter.limit("60/minute")
async def create_inventory_item(request: Request, item_data: InventoryItemCreate, user: dict = Depends(get_current_user)):
    item_doc = item_data.model_dump()
    item_doc["organization_id"] = user["organization_id"]
    item_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.inventory.insert_one(item_doc)
    item_doc["id"] = str(result.inserted_id)
    return InventoryItem(**item_doc)


@router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(user: dict = Depends(get_current_user)):
    items = await db.inventory.find({"organization_id": user["organization_id"]}).to_list(1000)
    for item in items:
        item["id"] = str(item.pop("_id"))
    return items


# ============= INVOICES =============
@router.post("/invoices", response_model=Invoice)
@limiter.limit("20/minute")
async def create_invoice(request: Request, invoice_data: InvoiceCreate, user: dict = Depends(get_current_user)):
    subtotal = sum(item.total for item in invoice_data.items)
    tax = subtotal * 0.1
    total = subtotal + tax

    seq = await next_sequence("invoice", user["organization_id"])
    invoice_number = f"INV-{seq:05d}"

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


@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find({"organization_id": user["organization_id"]}).to_list(1000)
    for invoice in invoices:
        invoice["id"] = str(invoice.pop("_id"))
    return invoices


# ============= SUPPLIERS =============
@router.post("/suppliers", response_model=Supplier)
@limiter.limit("60/minute")
async def create_supplier(request: Request, supplier_data: SupplierCreate, user: dict = Depends(get_current_user)):
    supplier_doc = supplier_data.model_dump()
    supplier_doc["organization_id"] = user["organization_id"]
    supplier_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.suppliers.insert_one(supplier_doc)
    supplier_doc["id"] = str(result.inserted_id)
    return Supplier(**supplier_doc)


@router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({"organization_id": user["organization_id"]}).to_list(1000)
    for supplier in suppliers:
        supplier["id"] = str(supplier.pop("_id"))
    return suppliers


# ============= PURCHASE ORDERS =============
@router.post("/purchase-orders", response_model=PurchaseOrder)
@limiter.limit("20/minute")
async def create_purchase_order(request: Request, po_data: PurchaseOrderCreate, user: dict = Depends(get_current_user)):
    subtotal = sum(item.total for item in po_data.items)
    tax = subtotal * 0.1
    total = subtotal + tax

    seq = await next_sequence("po", user["organization_id"])
    po_number = f"PO-{seq:05d}"

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


@router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(user: dict = Depends(get_current_user)):
    pos = await db.purchase_orders.find({"organization_id": user["organization_id"]}).to_list(1000)
    for po in pos:
        po["id"] = str(po.pop("_id"))
    return pos
