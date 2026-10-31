"""CRM routes: leads, contacts, deals, stages."""
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from bson import ObjectId

from core.database import db
from core.security import get_current_user
from core.throttle import limiter
from models.schemas import (
    Lead, LeadCreate,
    Contact, ContactCreate,
    Deal, DealCreate, DealUpdate,
)

router = APIRouter(prefix="/crm", tags=["crm"])


# ============= LEADS =============
@router.post("/leads", response_model=Lead)
@limiter.limit("60/minute")
async def create_lead(request: Request, lead_data: LeadCreate, user: dict = Depends(get_current_user)):
    lead_doc = lead_data.model_dump()
    lead_doc["organization_id"] = user["organization_id"]
    lead_doc["owner_id"] = user["id"]
    lead_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.leads.insert_one(lead_doc)
    lead_doc["id"] = str(result.inserted_id)
    return Lead(**lead_doc)


@router.get("/leads", response_model=List[Lead])
async def get_leads(user: dict = Depends(get_current_user)):
    leads = await db.leads.find({"organization_id": user["organization_id"]}).to_list(1000)
    for lead in leads:
        lead["id"] = str(lead.pop("_id"))
    return leads


# ============= CONTACTS =============
@router.post("/contacts", response_model=Contact)
@limiter.limit("60/minute")
async def create_contact(request: Request, contact_data: ContactCreate, user: dict = Depends(get_current_user)):
    contact_doc = contact_data.model_dump()
    contact_doc["organization_id"] = user["organization_id"]
    contact_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.contacts.insert_one(contact_doc)
    contact_doc["id"] = str(result.inserted_id)
    return Contact(**contact_doc)


@router.get("/contacts", response_model=List[Contact])
async def get_contacts(user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"organization_id": user["organization_id"]}).to_list(1000)
    for contact in contacts:
        contact["id"] = str(contact.pop("_id"))
    return contacts


# ============= DEALS & PIPELINE =============
@router.post("/deals", response_model=Deal)
@limiter.limit("60/minute")
async def create_deal(request: Request, deal_data: DealCreate, user: dict = Depends(get_current_user)):
    deal_doc = deal_data.model_dump()
    deal_doc["organization_id"] = user["organization_id"]
    deal_doc["owner_id"] = user["id"]
    deal_doc["created_at"] = datetime.now(timezone.utc)
    result = await db.deals.insert_one(deal_doc)
    deal_doc["id"] = str(result.inserted_id)
    return Deal(**deal_doc)


@router.get("/deals", response_model=List[Deal])
async def get_deals(user: dict = Depends(get_current_user)):
    deals = await db.deals.find({"organization_id": user["organization_id"]}).to_list(1000)
    for deal in deals:
        deal["id"] = str(deal.pop("_id"))
    return deals


@router.patch("/deals/{deal_id}", response_model=Deal)
@limiter.limit("60/minute")
async def update_deal(request: Request, deal_id: str, update_data: DealUpdate, user: dict = Depends(get_current_user)):
    result = await db.deals.find_one_and_update(
        {"_id": ObjectId(deal_id), "organization_id": user["organization_id"]},
        {"$set": {"stage": update_data.stage}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Deal not found")
    result["id"] = str(result.pop("_id"))
    return Deal(**result)


@router.get("/stages")
async def get_stages(user: dict = Depends(get_current_user)):
    stages = await db.stages.find(
        {"organization_id": user["organization_id"]}, {"_id": 0}
    ).sort("order", 1).to_list(100)
    return stages
