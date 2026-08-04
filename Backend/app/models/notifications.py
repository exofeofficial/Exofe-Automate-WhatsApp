from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class NotificationRow(_CamelModel):
    id: str
    title: str
    body: str
    is_read: bool
    created_at: str


class NotificationsResponse(_CamelModel):
    notifications: list[NotificationRow]
    unread_count: int
