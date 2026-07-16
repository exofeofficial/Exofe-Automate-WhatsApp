# app/repositories/dashboard_repository.py

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session


def count_orders_created_on(db: Session, business_id: str, day: date) -> int:
    row = db.execute(
        text(
            "SELECT COUNT(*) FROM orders WHERE business_id = :business_id AND created_at::date = :day"
        ),
        {"business_id": business_id, "day": day},
    ).fetchone()
    return row[0]


def count_by_statuses(db: Session, business_id: str, statuses: list[str]) -> int:
    row = db.execute(
        text(
            "SELECT COUNT(*) FROM orders WHERE business_id = :business_id AND status = ANY(:statuses)"
        ),
        {"business_id": business_id, "statuses": statuses},
    ).fetchone()
    return row[0]


def sum_revenue_between(db: Session, business_id: str, start: date, end_exclusive: date) -> float:
    """Delivered orders only, [start, end_exclusive) — matches how
    customers.total_spent already defines 'real' revenue elsewhere."""
    row = db.execute(
        text(
            """
            SELECT COALESCE(SUM(total), 0) FROM orders
            WHERE business_id = :business_id AND status = 'delivered'
              AND created_at::date >= :start AND created_at::date < :end_exclusive
            """
        ),
        {"business_id": business_id, "start": start, "end_exclusive": end_exclusive},
    ).fetchone()
    return float(row[0])


def count_conversations_between(db: Session, business_id: str, start: date, end_exclusive: date) -> int:
    """Distinct customers messaged, not raw message count — matches what
    'conversations' means to a shop owner. Always 0 until the WhatsApp
    webhook exists and starts writing to whatsapp_message_logs."""
    row = db.execute(
        text(
            """
            SELECT COUNT(DISTINCT customer_id) FROM whatsapp_message_logs
            WHERE business_id = :business_id
              AND created_at::date >= :start AND created_at::date < :end_exclusive
            """
        ),
        {"business_id": business_id, "start": start, "end_exclusive": end_exclusive},
    ).fetchone()
    return row[0]


def ai_response_rate(db: Session, business_id: str, start: date, end_exclusive: date) -> float | None:
    """% of outbound messages that were AI-generated. None (not 0) when
    there's no outbound traffic at all — 0% would misleadingly read as
    "the AI is failing" rather than "no data exists yet"."""
    row = db.execute(
        text(
            """
            SELECT COUNT(*) FILTER (WHERE ai_generated), COUNT(*)
            FROM whatsapp_message_logs
            WHERE business_id = :business_id AND direction = 'outbound'
              AND created_at::date >= :start AND created_at::date < :end_exclusive
            """
        ),
        {"business_id": business_id, "start": start, "end_exclusive": end_exclusive},
    ).fetchone()
    ai_count, total = row[0], row[1]
    return round(ai_count / total * 100, 1) if total else None


def recent_orders(db: Session, business_id: str, limit: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT o.id, o.total, o.status, o.created_at, c.name AS customer_name
            FROM orders o JOIN customers c ON c.id = o.customer_id
            WHERE o.business_id = :business_id
            ORDER BY o.created_at DESC LIMIT :limit
            """
        ),
        {"business_id": business_id, "limit": limit},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def recent_customers(db: Session, business_id: str, limit: int) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT id, name, created_at FROM customers "
            "WHERE business_id = :business_id ORDER BY created_at DESC LIMIT :limit"
        ),
        {"business_id": business_id, "limit": limit},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def get_onboarding_status(db: Session, business_id: str) -> dict:
    """One round trip for the dashboard's "Setup guide" checklist —
    whether each onboarding step is actually done, not just clicked."""
    row = db.execute(
        text(
            """
            SELECT
                (SELECT whatsapp_connected_at IS NOT NULL FROM businesses WHERE id = :business_id)
                    AS whatsapp_connected,
                EXISTS(SELECT 1 FROM products WHERE business_id = :business_id) AS has_products,
                EXISTS(
                    SELECT 1 FROM subscriptions WHERE business_id = :business_id AND status = 'active'
                ) AS has_paid_plan,
                (SELECT COUNT(*) FROM users WHERE business_id = :business_id) > 1 AS has_team_members
            """
        ),
        {"business_id": business_id},
    ).fetchone()
    return dict(row._mapping)


def daily_order_stats(db: Session, business_id: str, start: date, end_inclusive: date) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT created_at::date AS day,
                   COUNT(*) AS orders,
                   COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) AS revenue
            FROM orders
            WHERE business_id = :business_id
              AND created_at::date >= :start AND created_at::date <= :end_inclusive
            GROUP BY created_at::date
            ORDER BY day
            """
        ),
        {"business_id": business_id, "start": start, "end_inclusive": end_inclusive},
    ).fetchall()
    return [dict(row._mapping) for row in rows]