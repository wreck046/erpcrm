"""Dashboard aggregated stats."""
from fastapi import APIRouter, Depends

from core.database import db
from core.security import get_current_user
from models.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    org_id = user["organization_id"]

    total_leads = await db.leads.count_documents({"organization_id": org_id})
    total_contacts = await db.contacts.count_documents({"organization_id": org_id})
    total_deals = await db.deals.count_documents({"organization_id": org_id})

    deals = await db.deals.find({"organization_id": org_id}, {"_id": 0, "value": 1}).to_list(1000)
    total_deal_value = sum(deal.get("value", 0) for deal in deals)

    inventory = await db.inventory.find(
        {"organization_id": org_id}, {"_id": 0, "quantity": 1, "unit_price": 1}
    ).to_list(1000)
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
        pending_pos=pending_pos,
    )
