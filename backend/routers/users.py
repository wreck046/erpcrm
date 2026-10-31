"""User invite + role management."""
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from bson import ObjectId

from core.config import FRONTEND_URL, VALID_ROLES, assignable_roles
from core.database import db
from core.email_service import send_email, invite_email_html
from core.security import (
    hash_password,
    create_access_token,
    get_current_user,
    set_auth_cookie,
)
from core.throttle import limiter
from models.schemas import (
    TenantUser,
    UserInviteCreate,
    UserInviteAccept,
    UserRoleUpdate,
    InviteInfo,
    User,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[TenantUser])
async def list_tenant_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({"organization_id": user["organization_id"]}).to_list(1000)
    return [
        {
            "id": str(u["_id"]),
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "status": u.get("status", "active"),
            "created_at": u["created_at"],
        }
        for u in users
    ]


@router.post("/invite", response_model=TenantUser)
@limiter.limit("30/minute")
async def invite_user(request: Request, payload: UserInviteCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admin or manager can invite users")

    role = payload.role.lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")

    allowed = assignable_roles(user["role"])
    if role not in allowed:
        raise HTTPException(status_code=403, detail=f"Your role ({user['role']}) cannot assign '{role}'. Allowed: {allowed}")

    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org = await db.organizations.find_one({"_id": ObjectId(user["organization_id"])})
    org_name = org["name"] if org else "Your Organization"

    if payload.mode == "direct":
        if not payload.temp_password or len(payload.temp_password) < 6:
            raise HTTPException(status_code=400, detail="Temp password must be at least 6 characters")
        user_doc = {
            "email": email,
            "password_hash": hash_password(payload.temp_password),
            "name": payload.name,
            "role": role,
            "organization_id": user["organization_id"],
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        return {
            "id": str(result.inserted_id),
            "email": email,
            "name": payload.name,
            "role": role,
            "status": "active",
            "created_at": user_doc["created_at"],
        }

    # mode == "invite"
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    user_doc = {
        "email": email,
        "password_hash": "",
        "name": payload.name,
        "role": role,
        "organization_id": user["organization_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    await db.invitations.insert_one({
        "token": token,
        "user_id": user_id,
        "email": email,
        "organization_id": user["organization_id"],
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.now(timezone.utc),
    })

    invite_link = f"{FRONTEND_URL}/accept-invite?token={token}"
    html = invite_email_html(user["name"], org_name, role, invite_link)
    email_id = await send_email(email, f"You're invited to {org_name}", html)
    logger.info("Invite sent to %s (resend_id=%s)", email, email_id)

    return {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "role": role,
        "status": "pending",
        "created_at": user_doc["created_at"],
    }


@router.get("/invitations/{token}", response_model=InviteInfo)
async def get_invitation(token: str):
    inv = await db.invitations.find_one({"token": token, "used": False})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    expires_at = inv["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation expired")
    user_doc = await db.users.find_one({"_id": ObjectId(inv["user_id"])})
    org_doc = await db.organizations.find_one({"_id": ObjectId(inv["organization_id"])})
    if not user_doc or not org_doc:
        raise HTTPException(status_code=404, detail="Invitation invalid")
    return {
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc["role"],
        "organization_name": org_doc["name"],
        "inviter_name": "Your team",
        "expires_at": inv["expires_at"],
    }


@router.post("/invitations/accept", response_model=User)
@limiter.limit("10/minute")
async def accept_invitation(request: Request, payload: UserInviteAccept, response: Response):
    inv = await db.invitations.find_one({"token": payload.token, "used": False})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    expires_at = inv["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation expired")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user_doc = await db.users.find_one({"_id": ObjectId(inv["user_id"])})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"_id": ObjectId(inv["user_id"])},
        {"$set": {"password_hash": hash_password(payload.password), "status": "active"}},
    )
    await db.invitations.update_one({"token": payload.token}, {"$set": {"used": True}})

    token = create_access_token(
        str(user_doc["_id"]),
        user_doc["email"],
        user_doc["organization_id"],
        user_doc["role"],
    )
    set_auth_cookie(response, token)
    return User(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        name=user_doc["name"],
        role=user_doc["role"],
        organization_id=user_doc["organization_id"],
        created_at=user_doc["created_at"],
    )


@router.patch("/{user_id}/role", response_model=TenantUser)
@limiter.limit("30/minute")
async def update_user_role(request: Request, user_id: str, payload: UserRoleUpdate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admin or manager can update roles")
    new_role = payload.role.lower()
    if new_role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if new_role not in assignable_roles(user["role"]):
        raise HTTPException(status_code=403, detail=f"Your role cannot assign '{new_role}'")
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    target = await db.users.find_one({"_id": ObjectId(user_id), "organization_id": user["organization_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="User not found in your tenant")

    if user["role"] == "manager" and target["role"] == "admin":
        raise HTTPException(status_code=403, detail="Managers cannot modify admin users")

    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
    target["role"] = new_role
    return {
        "id": str(target["_id"]),
        "email": target["email"],
        "name": target["name"],
        "role": target["role"],
        "status": target.get("status", "active"),
        "created_at": target["created_at"],
    }


@router.delete("/{user_id}")
@limiter.limit("30/minute")
async def remove_user(request: Request, user_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can remove users")
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    result = await db.users.delete_one({"_id": ObjectId(user_id), "organization_id": user["organization_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found in your tenant")
    await db.invitations.delete_many({"user_id": user_id})
    return {"status": "removed"}
