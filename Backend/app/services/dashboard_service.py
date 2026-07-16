# app/services/dashboard_service.py

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.repositories import dashboard_repository

PENDING_STATUSES = ["new", "confirmed", "shipped"]
COMPLETED_STATUSES = ["delivered"]


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None  # no baseline to compare against — not the same as 0% change
    return round((current - previous) / previous * 100, 1)


def get_summary(db: Session, business_id: str) -> dict:
    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    todays_orders = dashboard_repository.count_orders_created_on(db, business_id, today)
    yesterdays_orders = dashboard_repository.count_orders_created_on(db, business_id, yesterday)

    pending = dashboard_repository.count_by_statuses(db, business_id, PENDING_STATUSES)
    completed = dashboard_repository.count_by_statuses(db, business_id, COMPLETED_STATUSES)

    month_start = today.replace(day=1)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    revenue_this_month = dashboard_repository.sum_revenue_between(db, business_id, month_start, tomorrow)
    revenue_last_month = dashboard_repository.sum_revenue_between(db, business_id, prev_month_start, month_start)

    week_start = today - timedelta(days=7)
    prev_week_start = today - timedelta(days=14)

    conversations_this_week = dashboard_repository.count_conversations_between(db, business_id, week_start, tomorrow)
    conversations_last_week = dashboard_repository.count_conversations_between(db, business_id, prev_week_start, week_start)

    response_rate = dashboard_repository.ai_response_rate(db, business_id, week_start, tomorrow)

    return {
        "todays_orders": {"value": todays_orders, "change_percent": _pct_change(todays_orders, yesterdays_orders)},
        "pending_orders": {"value": pending, "change_percent": None},  # a live gauge, not a trend
        "completed_orders": {"value": completed, "change_percent": None},  # all-time total, no period to compare
        "total_conversations": {
            "value": conversations_this_week,
            "change_percent": _pct_change(conversations_this_week, conversations_last_week),
        },
        "revenue_this_month": {
            "value": revenue_this_month,
            "change_percent": _pct_change(revenue_this_month, revenue_last_month),
        },
        "ai_response_rate": {"value": response_rate, "change_percent": None},
    }


def get_activity(db: Session, business_id: str, limit: int) -> list[dict]:
    orders = dashboard_repository.recent_orders(db, business_id, limit)
    customers = dashboard_repository.recent_customers(db, business_id, limit)

    events = [
        {
            "text": f"New order from {o['customer_name']} — PKR {float(o['total']):,.0f}",
            "created_at": o["created_at"],
            "tag": "Order",
        }
        for o in orders
    ] + [
        {
            "text": f"New customer: {c['name'] or 'Unknown'}",
            "created_at": c["created_at"],
            "tag": "Customer",
        }
        for c in customers
    ]

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events[:limit]


def get_analytics(db: Session, business_id: str, days: int) -> list[dict]:
    end = date.today()
    start = end - timedelta(days=days - 1)
    return dashboard_repository.daily_order_stats(db, business_id, start, end)


def get_onboarding_status(db: Session, business_id: str) -> dict:
    return dashboard_repository.get_onboarding_status(db, business_id)