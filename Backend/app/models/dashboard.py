# app/models/dashboard.py

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class MetricValue(_CamelModel):
    value: float | None  # null = no data yet (e.g. AI response rate before WhatsApp ships)
    change_percent: float | None = None  # null = not enough history to compare against


class DashboardSummary(_CamelModel):
    todays_orders: MetricValue
    pending_orders: MetricValue
    completed_orders: MetricValue
    total_conversations: MetricValue
    revenue_this_month: MetricValue
    ai_response_rate: MetricValue


class DashboardSummaryWrapper(BaseModel):
    summary: DashboardSummary


class ActivityItem(_CamelModel):
    text: str
    time: str  # ISO timestamp — frontend formats to "2h ago" etc. itself
    tag: str


class ActivityResponse(BaseModel):
    activity: list[ActivityItem]


class AnalyticsPoint(_CamelModel):
    date: str
    orders: int
    revenue: float


class AnalyticsResponse(BaseModel):
    points: list[AnalyticsPoint]