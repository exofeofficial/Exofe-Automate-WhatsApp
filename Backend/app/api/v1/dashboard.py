# app/api/v1/dashboard.py
# Endpoints: GET /dashboard/summary, GET /dashboard/activity,
# GET /dashboard/analytics, GET /dashboard/onboarding

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.dashboard import (
    ActivityItem,
    ActivityResponse,
    AnalyticsPoint,
    AnalyticsResponse,
    DashboardSummary,
    DashboardSummaryWrapper,
    MetricValue,
    OnboardingStatus,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("/summary", response_model=DashboardSummaryWrapper)
def get_summary(db: DbSession, current: CurrentOwner) -> DashboardSummaryWrapper:
    business_id = _require_business(current)
    data = dashboard_service.get_summary(db, business_id)
    return DashboardSummaryWrapper(
        summary=DashboardSummary(**{key: MetricValue(**metric) for key, metric in data.items()})
    )


@router.get("/activity", response_model=ActivityResponse)
def get_activity(
    db: DbSession, current: CurrentOwner, limit: int = Query(default=10, le=50)
) -> ActivityResponse:
    business_id = _require_business(current)
    events = dashboard_service.get_activity(db, business_id, limit)
    return ActivityResponse(
        activity=[
            ActivityItem(text=e["text"], time=e["created_at"].isoformat(), tag=e["tag"]) for e in events
        ]
    )


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: DbSession, current: CurrentOwner, days: int = Query(default=30, ge=1, le=90)
) -> AnalyticsResponse:
    business_id = _require_business(current)
    rows = dashboard_service.get_analytics(db, business_id, days)
    return AnalyticsResponse(
        points=[
            AnalyticsPoint(date=r["day"].isoformat(), orders=r["orders"], revenue=float(r["revenue"]))
            for r in rows
        ]
    )


@router.get("/onboarding", response_model=OnboardingStatus)
def get_onboarding(db: DbSession, current: CurrentOwner) -> OnboardingStatus:
    business_id = _require_business(current)
    data = dashboard_service.get_onboarding_status(db, business_id)
    return OnboardingStatus(**data)