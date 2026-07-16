# repositories/business_repository.py
from sqlalchemy import text
from sqlalchemy.orm import Session

# ── Clients (businesses) ─────────────────────────────────────────────────────

def list_businesses(db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                b.id, b.name, b.industry, b.status, b.whatsapp_connected_at,
                b.created_at,
                u.id AS owner_id, u.first_name AS owner_first_name,
                u.last_name AS owner_last_name, u.email AS owner_email,
                s.plan, s.status AS subscription_status
            FROM businesses b
            JOIN users u ON u.id = b.owner_id
            LEFT JOIN subscriptions s ON s.business_id = b.id
            ORDER BY b.created_at DESC
            """
        )
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def get_business_by_id(db: Session, business_id: str) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT
                b.*,
                u.id AS owner_id, u.first_name AS owner_first_name,
                u.last_name AS owner_last_name, u.email AS owner_email,
                u.phone AS owner_phone,
                s.plan, s.status AS subscription_status, s.amount AS subscription_amount,
                s.current_period_end
            FROM businesses b
            JOIN users u ON u.id = b.owner_id
            LEFT JOIN subscriptions s ON s.business_id = b.id
            WHERE b.id = :business_id
            """
        ),
        {"business_id": business_id},
    ).fetchone()
    if not row:
        return None
    data = dict(row._mapping)

    staff_count = db.execute(
        text("SELECT COUNT(*) FROM users WHERE business_id = :business_id"),
        {"business_id": business_id},
    ).scalar()
    data["staff_count"] = staff_count

    return data


def update_business_status(db: Session, business_id: str, status: str) -> dict | None:
    row = db.execute(
        text(
            "UPDATE businesses SET status = :status, updated_at = NOW() "
            "WHERE id = :business_id RETURNING id, name, status"
        ),
        {"status": status, "business_id": business_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else None


# ── Subscriptions ────────────────────────────────────────────────────────────

def list_subscriptions(db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT id, business_id, business_name, plan, status, amount, current_period_end
            FROM subscriptions
            ORDER BY current_period_end DESC
            """
        )
    ).fetchall()
    return [dict(row._mapping) for row in rows]


# ── Revenue ──────────────────────────────────────────────────────────────────

def get_revenue_summary(db: Session) -> dict:
    total_revenue = db.execute(
        text("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'succeeded'")
    ).scalar()

    mrr = db.execute(
        text("SELECT COALESCE(SUM(amount), 0) FROM subscriptions WHERE status = 'active'")
    ).scalar()

    by_plan_rows = db.execute(
        text(
            """
            SELECT plan, COUNT(*) AS business_count, COALESCE(SUM(amount), 0) AS mrr
            FROM subscriptions
            WHERE status = 'active'
            GROUP BY plan
            """
        )
    ).fetchall()

    recent_payments_rows = db.execute(
        text(
            """
            SELECT p.id, p.amount, p.currency, p.status, p.paid_at, b.name AS business_name
            FROM payments p
            JOIN businesses b ON b.id = p.business_id
            ORDER BY p.paid_at DESC NULLS LAST
            LIMIT 20
            """
        )
    ).fetchall()

    return {
        "total_revenue": total_revenue,
        "mrr": mrr,
        "by_plan": [dict(row._mapping) for row in by_plan_rows],
        "recent_payments": [dict(row._mapping) for row in recent_payments_rows],
    }


# ── Admin audit log ──────────────────────────────────────────────────────────

def log_admin_action(db: Session, *, admin_id: str, action: str, target_business_id: str | None) -> None:
    db.execute(
        text(
            "INSERT INTO admin_logs (admin_id, action, target_business_id) "
            "VALUES (:admin_id, :action, :target_business_id)"
        ),
        {"admin_id": admin_id, "action": action, "target_business_id": target_business_id},
    )
    db.commit()


def list_admin_logs(db: Session, limit: int = 100) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                l.id, l.action, l.created_at,
                a.first_name AS admin_first_name, a.last_name AS admin_last_name,
                b.id AS target_business_id, b.name AS target_business_name
            FROM admin_logs l
            JOIN users a ON a.id = l.admin_id
            LEFT JOIN businesses b ON b.id = l.target_business_id
            ORDER BY l.created_at DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def get_business_name(db: Session, business_id: str) -> str | None:
    return db.execute(
        text("SELECT name FROM businesses WHERE id = :id"), {"id": business_id}
    ).scalar()


# ── Feature flags ────────────────────────────────────────────────────────────

def list_feature_flags(db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT f.id, f.key, f.enabled, f.business_id, b.name AS business_name
            FROM feature_flags f
            LEFT JOIN businesses b ON b.id = f.business_id
            ORDER BY f.key, f.business_id NULLS FIRST
            """
        )
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def set_feature_flag(db: Session, *, key: str, enabled: bool, business_id: str | None) -> dict:
    """Get-or-create-then-update semantics for one (key, business_id) row.
    business_id=None means the global flag for that key."""
    existing = db.execute(
        text(
            "SELECT id FROM feature_flags WHERE key = :key AND business_id IS NOT DISTINCT FROM :business_id"
        ),
        {"key": key, "business_id": business_id},
    ).fetchone()

    if existing:
        row = db.execute(
            text("UPDATE feature_flags SET enabled = :enabled WHERE id = :id RETURNING *"),
            {"enabled": enabled, "id": existing.id},
        ).fetchone()
    else:
        row = db.execute(
            text(
                "INSERT INTO feature_flags (key, enabled, business_id) "
                "VALUES (:key, :enabled, :business_id) RETURNING *"
            ),
            {"key": key, "enabled": enabled, "business_id": business_id},
        ).fetchone()

    db.commit()
    return dict(row._mapping)