# models/product.py
# Pydantic request/response schemas for products and categories endpoints.

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_Ca
    )