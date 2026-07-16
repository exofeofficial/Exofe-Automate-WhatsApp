from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from typing import Literal

# Admin user list
class AdminUserRow(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    phone: str | None
    country_code: str | None
    business_name: str | None
    email_verified: bool
    created_at: str


class AdminUsersResponse(BaseModel):
    users: list[AdminUserRow]

# Admin client list
class ClientRow(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    industry: str | None
    status: str
    whatsapp_connected: bool
    owner_name: str
    owner_email: str
    plan: str | None
    subscription_status: str | None
    created_at: str


class ClientsResponse(BaseModel):
    clients: list[ClientRow]

# Admin client id response
class ClientDetail(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    industry: str | None
    status: str
    description: str | None
    support_email: str | None
    support_phone: str | None
    whatsapp_number: str | None
    whatsapp_connected: bool
    owner_name: str
    owner_email: str
    owner_phone: str | None
    staff_count: int
    plan: str | None
    subscription_status: str | None
    subscription_amount: float | None
    current_period_end: str | None
    created_at: str


class ClientDetailResponse(BaseModel):
    client: ClientDetail

# Admin client status
class UpdateClientStatusRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    status: Literal["active", "suspended"]


class UpdateClientStatusResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: str
    name: str
    status: str

# Admin subscriptions list
class SubscriptionRow(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    business_id: str
    business_name: str | None
    plan: str
    status: str
    amount: float
    current_period_end: str


class SubscriptionsResponse(BaseModel):
    subscriptions: list[SubscriptionRow]

# Admin revenue
class RevenueByPlan(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    plan: str
    business_count: int
    mrr: float


class RecentPayment(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: str
    amount: float
    currency: str
    status: str
    paid_at: str | None
    business_name: str


class RevenueResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    total_revenue: float
    mrr: float
    by_plan: list[RevenueByPlan]
    recent_payments: list[RecentPayment]

# Admin Logs
class AdminLogRow(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    action: str
    admin_name: str
    target_business_id: str | None
    target_business_name: str | None
    created_at: str


class AdminLogsResponse(BaseModel):
    logs: list[AdminLogRow]

# Admin feature flags
class FeatureFlagRow(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    key: str
    enabled: bool
    business_id: str | None
    business_name: str | None


class FeatureFlagsResponse(BaseModel):
    flags: list[FeatureFlagRow]

# Admin feature flags key

class SetFeatureFlagRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    enabled: bool
    business_id: str | None = None


class FeatureFlagResponse(BaseModel):
    flag: FeatureFlagRow