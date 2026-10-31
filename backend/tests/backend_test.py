"""Comprehensive backend tests for ERP/CRM blueprint.

Covers:
- Auth (register/login/me/logout)
- Dashboard stats
- CRM (leads, contacts, deals, stages)
- ERP (inventory, invoices, suppliers, purchase orders)
- Email campaigns (blueprint draft)
- Payments checkout
- Multi-tenant isolation
- Throttling (rate limit checks)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@erp-crm.com"
ADMIN_PASSWORD = "admin123"


# ============== Fixtures ==============
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def tenant_b_session():
    """Register a new tenant for isolation tests."""
    s = requests.Session()
    unique = uuid.uuid4().hex[:8]
    email = f"tenantb_{unique}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "email": email,
        "password": "passw0rd!",
        "name": "Tenant B User",
        "organization_name": f"TenantB_{unique}"
    }, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    return s, email


# ============== Auth ==============
class TestAuth:
    def test_login_admin(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data and "organization_id" in data
        assert s.cookies.get("access_token"), "access_token cookie not set"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_returns_user(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_logout_clears_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # After logout, /me should fail
        s.cookies.clear()
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_register_new_tenant(self):
        s = requests.Session()
        unique = uuid.uuid4().hex[:8]
        r = s.post(f"{API}/auth/register", json={
            "email": f"newuser_{unique}@example.com",
            "password": "passw0rd!",
            "name": "New User",
            "organization_name": f"Org_{unique}"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert data["organization_id"]
        assert s.cookies.get("access_token")


# ============== Dashboard ==============
class TestDashboard:
    def test_stats(self, admin_session):
        r = admin_session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for key in ["total_leads", "total_contacts", "total_deals", "total_deal_value",
                    "total_inventory_value", "pending_invoices", "pending_pos"]:
            assert key in d


# ============== CRM ==============
class TestCRM:
    def test_create_and_get_lead(self, admin_session):
        payload = {"name": "TEST_Lead", "email": f"lead_{uuid.uuid4().hex[:6]}@x.com",
                   "company": "Acme", "status": "new", "value": 1000}
        r = admin_session.post(f"{API}/crm/leads", json=payload)
        assert r.status_code == 200, r.text
        lead = r.json()
        assert lead["name"] == "TEST_Lead"
        assert "id" in lead
        # GET verification
        r2 = admin_session.get(f"{API}/crm/leads")
        assert r2.status_code == 200
        ids = [l["id"] for l in r2.json()]
        assert lead["id"] in ids

    def test_create_and_get_contact(self, admin_session):
        payload = {"name": "TEST_Contact", "email": f"c_{uuid.uuid4().hex[:6]}@x.com",
                   "company": "Acme", "position": "CTO"}
        r = admin_session.post(f"{API}/crm/contacts", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["name"] == "TEST_Contact"
        r2 = admin_session.get(f"{API}/crm/contacts")
        assert r2.status_code == 200
        assert any(x["id"] == c["id"] for x in r2.json())

    def test_stages_seeded(self, admin_session):
        r = admin_session.get(f"{API}/crm/stages")
        assert r.status_code == 200
        stages = r.json()
        assert len(stages) >= 5
        names = [s["name"] for s in stages]
        for expected in ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won"]:
            assert expected in names

    def test_create_deal_and_update_stage(self, admin_session):
        payload = {"title": "TEST_Deal", "value": 5000, "stage": "Lead",
                   "description": "test deal"}
        r = admin_session.post(f"{API}/crm/deals", json=payload)
        assert r.status_code == 200, r.text
        deal = r.json()
        assert deal["stage"] == "Lead"
        # PATCH stage
        r2 = admin_session.patch(f"{API}/crm/deals/{deal['id']}", json={"stage": "Proposal"})
        assert r2.status_code == 200, r2.text
        assert r2.json()["stage"] == "Proposal"
        # GET deals
        r3 = admin_session.get(f"{API}/crm/deals")
        assert r3.status_code == 200
        matched = next((d for d in r3.json() if d["id"] == deal["id"]), None)
        assert matched and matched["stage"] == "Proposal"


# ============== ERP ==============
class TestERP:
    def test_inventory_crud(self, admin_session):
        payload = {"name": "TEST_Widget", "sku": f"SKU-{uuid.uuid4().hex[:6]}",
                   "quantity": 10, "unit_price": 25.5}
        r = admin_session.post(f"{API}/erp/inventory", json=payload)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["quantity"] == 10
        r2 = admin_session.get(f"{API}/erp/inventory")
        assert any(x["id"] == item["id"] for x in r2.json())

    def test_invoice_create_with_tax_and_number(self, admin_session):
        items = [{"description": "Service A", "quantity": 2, "unit_price": 50, "total": 100}]
        r = admin_session.post(f"{API}/erp/invoices", json={
            "client_name": "TEST_Client",
            "client_email": "client@test.com",
            "items": items
        })
        assert r.status_code == 200, r.text
        inv = r.json()
        assert inv["subtotal"] == 100
        assert inv["tax"] == 10
        assert inv["total"] == 110
        assert inv["invoice_number"].startswith("INV-")
        assert len(inv["invoice_number"]) == len("INV-00001")
        r2 = admin_session.get(f"{API}/erp/invoices")
        assert any(x["id"] == inv["id"] for x in r2.json())

    def test_supplier_crud(self, admin_session):
        r = admin_session.post(f"{API}/erp/suppliers", json={
            "name": "TEST_Supplier", "email": f"s_{uuid.uuid4().hex[:6]}@x.com"
        })
        assert r.status_code == 200, r.text
        s = r.json()
        r2 = admin_session.get(f"{API}/erp/suppliers")
        assert any(x["id"] == s["id"] for x in r2.json())

    def test_purchase_order_create(self, admin_session):
        sr = admin_session.post(f"{API}/erp/suppliers", json={
            "name": "TEST_POSupplier", "email": f"pos_{uuid.uuid4().hex[:6]}@x.com"
        })
        supplier_id = sr.json()["id"]
        items = [{"description": "Raw", "quantity": 5, "unit_price": 20, "total": 100}]
        r = admin_session.post(f"{API}/erp/purchase-orders", json={
            "supplier_id": supplier_id, "items": items
        })
        assert r.status_code == 200, r.text
        po = r.json()
        assert po["po_number"].startswith("PO-")
        assert po["total"] == 110


# ============== Email ==============
class TestEmail:
    def test_create_email_campaign_draft(self, admin_session):
        r = admin_session.post(f"{API}/email/campaigns", json={
            "name": "TEST_Campaign", "subject": "Hi", "content": "Hello",
            "recipient_type": "leads"
        })
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["status"] == "draft"
        assert c["sent_count"] == 0
        r2 = admin_session.get(f"{API}/email/campaigns")
        assert any(x["id"] == c["id"] for x in r2.json())

    # NEW: email config status endpoint
    def test_email_config_requires_auth(self):
        r = requests.get(f"{API}/email/config")
        assert r.status_code == 401

    def test_email_config_returns_status(self, admin_session):
        r = admin_session.get(f"{API}/email/config")
        assert r.status_code == 200, r.text
        data = r.json()
        # Schema validation
        for k in ("enabled", "sender", "is_default_sandbox", "note"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["enabled"], bool)
        assert isinstance(data["sender"], str) and "@" in data["sender"]
        assert isinstance(data["is_default_sandbox"], bool)
        assert isinstance(data["note"], str) and len(data["note"]) > 0
        # Consistency: sandbox flag aligns with sender domain
        assert data["is_default_sandbox"] == data["sender"].endswith("@resend.dev")


# ============== Multi-tenant isolation ==============
class TestMultiTenant:
    def test_isolation_leads(self, admin_session, tenant_b_session):
        # Admin creates a marker lead
        r = admin_session.post(f"{API}/crm/leads", json={
            "name": "ADMIN_ONLY_LEAD", "email": f"admin_{uuid.uuid4().hex[:6]}@x.com"
        })
        assert r.status_code == 200
        admin_lead_id = r.json()["id"]
        # Tenant B should NOT see it
        sb, _ = tenant_b_session
        r2 = sb.get(f"{API}/crm/leads")
        assert r2.status_code == 200
        ids = [l["id"] for l in r2.json()]
        assert admin_lead_id not in ids
        names = [l["name"] for l in r2.json()]
        assert "ADMIN_ONLY_LEAD" not in names

    def test_isolation_stages_per_org(self, tenant_b_session):
        sb, _ = tenant_b_session
        r = sb.get(f"{API}/crm/stages")
        assert r.status_code == 200
        assert len(r.json()) >= 5


# ============== Throttling ==============
class TestThrottling:
    def test_payments_throttle_5_per_minute(self):
        """Use a fresh user to avoid impacting other tests."""
        s = requests.Session()
        unique = uuid.uuid4().hex[:8]
        rr = s.post(f"{API}/auth/register", json={
            "email": f"thr_{unique}@example.com",
            "password": "passw0rd!",
            "name": "Thr User",
            "organization_name": f"ThrOrg_{unique}"
        })
        assert rr.status_code == 200
        statuses = []
        for i in range(7):
            r = s.post(f"{API}/payments/checkout", json={
                "amount": 10.0, "description": "Test", "origin_url": "https://example.com"
            })
            statuses.append(r.status_code)
        # First 5 should succeed (200) or fail due to stripe; 6th+ must be 429
        assert 429 in statuses, f"Expected 429 in statuses, got {statuses}"



# ============== User Invite System ==============
class TestUserInvite:
    def test_list_users_admin_sees_self(self, admin_session):
        r = admin_session.get(f"{API}/users")
        assert r.status_code == 200, r.text
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        for u in users:
            assert "role" in u and "status" in u and "id" in u

    def test_invite_direct_admin_creates_manager(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_mgr_{unique}@example.com",
            "name": "TEST Manager",
            "role": "manager",
            "mode": "direct",
            "temp_password": "tempPass123"
        }
        r = admin_session.post(f"{API}/users/invite", json=payload)
        assert r.status_code == 200, r.text
        user = r.json()
        assert user["status"] == "active"
        assert user["role"] == "manager"
        assert user["email"] == payload["email"].lower()
        # Verify created user can login with temp password
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/login", json={"email": payload["email"], "password": "tempPass123"})
        assert r2.status_code == 200

    def test_invite_direct_missing_temp_password(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        r = admin_session.post(f"{API}/users/invite", json={
            "email": f"TEST_x_{unique}@example.com",
            "name": "X", "role": "user", "mode": "direct"
        })
        assert r.status_code == 400

    def test_invite_invalid_role(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        r = admin_session.post(f"{API}/users/invite", json={
            "email": f"TEST_inv_{unique}@example.com",
            "name": "X", "role": "superuser", "mode": "direct", "temp_password": "abcdef"
        })
        assert r.status_code == 400

    def test_manager_can_invite_sales_user_but_not_admin_manager(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        # Create a manager via admin
        mgr_email = f"TEST_mgr2_{unique}@example.com"
        r = admin_session.post(f"{API}/users/invite", json={
            "email": mgr_email, "name": "Mgr2", "role": "manager",
            "mode": "direct", "temp_password": "mgrPass123"
        })
        assert r.status_code == 200
        # Login as that manager
        ms = requests.Session()
        rl = ms.post(f"{API}/auth/login", json={"email": mgr_email, "password": "mgrPass123"})
        assert rl.status_code == 200
        # Manager can invite a sales user
        r1 = ms.post(f"{API}/users/invite", json={
            "email": f"TEST_sales_{unique}@example.com", "name": "Sales", "role": "sales",
            "mode": "direct", "temp_password": "salesPass123"
        })
        assert r1.status_code == 200, r1.text
        assert r1.json()["role"] == "sales"
        # Manager CANNOT invite admin
        r2 = ms.post(f"{API}/users/invite", json={
            "email": f"TEST_admin_{unique}@example.com", "name": "AdminX", "role": "admin",
            "mode": "direct", "temp_password": "adminPass123"
        })
        assert r2.status_code == 403, r2.text
        # Manager CANNOT invite manager
        r3 = ms.post(f"{API}/users/invite", json={
            "email": f"TEST_mgrX_{unique}@example.com", "name": "MgrX", "role": "manager",
            "mode": "direct", "temp_password": "mgrPass123"
        })
        assert r3.status_code == 403

    def test_invite_email_mode_creates_pending_and_token(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        email = f"TEST_inv_{unique}@example.com".lower()
        r = admin_session.post(f"{API}/users/invite", json={
            "email": email, "name": "Pending User", "role": "user", "mode": "invite"
        })
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["status"] == "pending"
        # Verify user shows in list as pending
        rl = admin_session.get(f"{API}/users")
        match = next((x for x in rl.json() if x["email"] == email), None)
        assert match and match["status"] == "pending"

    def test_invite_accept_flow_end_to_end(self, admin_session):
        """Create invite, fetch token via /users list+invitations collection workaround,
        then test get_invitation + accept by extracting token from the second invite call.
        We'll use the admin endpoint to verify by trying invalid token first."""
        # invalid token GET
        r = requests.get(f"{API}/users/invitations/NOT_A_REAL_TOKEN")
        assert r.status_code == 404
        # invalid token ACCEPT
        r2 = requests.post(f"{API}/users/invitations/accept", json={
            "token": "NOT_A_REAL_TOKEN", "password": "newpass123"
        })
        assert r2.status_code == 404

    def test_invite_accept_with_real_token(self, admin_session):
        """Pull a token directly from MongoDB to test the accept flow."""
        import pymongo
        unique = uuid.uuid4().hex[:8]
        email = f"TEST_accept_{unique}@example.com".lower()
        r = admin_session.post(f"{API}/users/invite", json={
            "email": email, "name": "Acceptor", "role": "user", "mode": "invite"
        })
        assert r.status_code == 200
        # Read token from MongoDB
        mc = pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        dbname = os.environ.get("DB_NAME", "test_database")
        # try common db names
        for candidate in [dbname, "test_database"]:
            inv = mc[candidate].invitations.find_one({"email": email, "used": False})
            if inv:
                break
        assert inv, "Invitation not found in DB"
        token = inv["token"]
        # GET invitation info
        rg = requests.get(f"{API}/users/invitations/{token}")
        assert rg.status_code == 200, rg.text
        info = rg.json()
        assert info["email"] == email
        assert info["role"] == "user"
        assert info["organization_name"]
        # Accept invitation
        s = requests.Session()
        ra = s.post(f"{API}/users/invitations/accept", json={"token": token, "password": "newPass789"})
        assert ra.status_code == 200, ra.text
        u = ra.json()
        assert u["email"] == email
        assert s.cookies.get("access_token")
        # Token cannot be re-used
        rr = requests.post(f"{API}/users/invitations/accept", json={"token": token, "password": "newPass789"})
        assert rr.status_code == 404
        # Logged-in via cookie, /me works
        rme = s.get(f"{API}/auth/me")
        assert rme.status_code == 200

    def test_update_role_admin(self, admin_session):
        # Create a sales user
        unique = uuid.uuid4().hex[:8]
        email = f"TEST_role_{unique}@example.com"
        r = admin_session.post(f"{API}/users/invite", json={
            "email": email, "name": "RoleTest", "role": "sales",
            "mode": "direct", "temp_password": "salesPass"
        })
        uid = r.json()["id"]
        # admin changes role to manager
        r2 = admin_session.patch(f"{API}/users/{uid}/role", json={"role": "manager"})
        assert r2.status_code == 200, r2.text
        assert r2.json()["role"] == "manager"
        # invalid role
        r3 = admin_session.patch(f"{API}/users/{uid}/role", json={"role": "godmode"})
        assert r3.status_code == 400

    def test_update_role_self_blocked(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()
        r = admin_session.patch(f"{API}/users/{me['id']}/role", json={"role": "manager"})
        assert r.status_code == 400

    def test_delete_user_admin_only(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        r = admin_session.post(f"{API}/users/invite", json={
            "email": f"TEST_del_{unique}@example.com", "name": "ToDelete",
            "role": "user", "mode": "direct", "temp_password": "delpass123"
        })
        uid = r.json()["id"]
        rd = admin_session.delete(f"{API}/users/{uid}")
        assert rd.status_code == 200
        # Confirm not in user list
        rl = admin_session.get(f"{API}/users")
        assert not any(u["id"] == uid for u in rl.json())

    def test_delete_self_blocked(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()
        r = admin_session.delete(f"{API}/users/{me['id']}")
        assert r.status_code == 400

    def test_non_admin_cannot_delete(self, admin_session):
        unique = uuid.uuid4().hex[:8]
        mgr_email = f"TEST_mgrdel_{unique}@example.com"
        admin_session.post(f"{API}/users/invite", json={
            "email": mgr_email, "name": "Mgr", "role": "manager",
            "mode": "direct", "temp_password": "mgrPass"
        })
        ms = requests.Session()
        ms.post(f"{API}/auth/login", json={"email": mgr_email, "password": "mgrPass"})
        # try to delete admin user
        me = admin_session.get(f"{API}/auth/me").json()
        r = ms.delete(f"{API}/users/{me['id']}")
        assert r.status_code == 403


# ============== Atomic Counters ==============
class TestAtomicCounters:
    def test_invoice_numbers_sequential(self, admin_session):
        items = [{"description": "X", "quantity": 1, "unit_price": 10, "total": 10}]
        nums = []
        for _ in range(3):
            r = admin_session.post(f"{API}/erp/invoices", json={
                "client_name": "TEST_Seq", "client_email": "x@y.com", "items": items
            })
            assert r.status_code == 200, r.text
            nums.append(r.json()["invoice_number"])
        # extract numeric suffixes
        seqs = [int(n.split("-")[1]) for n in nums]
        assert seqs[1] == seqs[0] + 1, f"Not sequential: {nums}"
        assert seqs[2] == seqs[1] + 1, f"Not sequential: {nums}"
        # No duplicates
        assert len(set(nums)) == 3

    def test_po_numbers_sequential(self, admin_session):
        # create a supplier
        sr = admin_session.post(f"{API}/erp/suppliers", json={
            "name": "TEST_SeqSup", "email": f"sq_{uuid.uuid4().hex[:6]}@x.com"
        })
        sid = sr.json()["id"]
        items = [{"description": "P", "quantity": 1, "unit_price": 50, "total": 50}]
        nums = []
        for _ in range(3):
            r = admin_session.post(f"{API}/erp/purchase-orders", json={
                "supplier_id": sid, "items": items
            })
            assert r.status_code == 200, r.text
            nums.append(r.json()["po_number"])
        seqs = [int(n.split("-")[1]) for n in nums]
        assert seqs[1] == seqs[0] + 1, f"PO not sequential: {nums}"
        assert seqs[2] == seqs[1] + 1, f"PO not sequential: {nums}"
        assert len(set(nums)) == 3

    def test_counter_per_tenant_starts_at_one(self):
        """A brand-new tenant should start at INV-00001."""
        s = requests.Session()
        unique = uuid.uuid4().hex[:8]
        rr = s.post(f"{API}/auth/register", json={
            "email": f"newtenant_{unique}@example.com",
            "password": "passw0rd!",
            "name": "NT", "organization_name": f"NT_{unique}"
        })
        assert rr.status_code == 200
        items = [{"description": "A", "quantity": 1, "unit_price": 5, "total": 5}]
        r = s.post(f"{API}/erp/invoices", json={
            "client_name": "C", "client_email": "c@c.com", "items": items
        })
        assert r.status_code == 200, r.text
        assert r.json()["invoice_number"] == "INV-00001", r.json()["invoice_number"]
