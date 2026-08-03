from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StarterTemplateRow(_CamelModel):
    key: str
    label: str
    hint: str
    category: str
    body: str
    variables: list[str]
    status: str | None  # None = never activated by this business
    rejection_reason: str | None


class StarterTemplatesResponse(_CamelModel):
    templates: list[StarterTemplateRow]


class ActivateTemplateResponse(_CamelModel):
    key: str
    status: str
