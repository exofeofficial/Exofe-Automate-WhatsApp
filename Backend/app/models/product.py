# app/models/product.py

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

ProductStatus = Literal["active", "draft"]

MAX_IMAGES = 5
MAX_OPTIONS = 2


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


# ── Shared shapes ────────────────────────────────────────────────────────────

class ProductOption(_CamelModel):
    name: str = Field(..., min_length=1, max_length=50)
    values: list[str] = Field(..., min_length=1)


class ProductVariantRequest(_CamelModel):
    option_values: list[str] = Field(..., min_length=1)
    sku: str = Field(default="", max_length=100)
    price: float = Field(..., ge=0)
    stock: int = Field(..., ge=0)


class ProductVariantResponse(_CamelModel):
    id: str
    option_values: list[str]
    sku: str
    price: float
    stock: int


# ── Product requests ─────────────────────────────────────────────────────────

class ProductRequest(_CamelModel):
    """Matches ProductInput in api.ts. The frontend always sends the FULL
    product on both create and update (PATCH is a full replace, not a
    partial patch) — see ProductFormPage.tsx's buildPayload(). `category`
    is a name string; the service layer resolves/creates the matching
    categories row."""

    name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=150)
    sku: str = Field(default="", max_length=100)
    price: float = Field(..., ge=0)
    compare_at_price: float | None = Field(default=None, ge=0)
    stock: int = Field(..., ge=0)
    description: str = Field(default="", max_length=2000)
    status: ProductStatus = "draft"
    images: list[str] = Field(default_factory=list, max_length=MAX_IMAGES)
    has_variants: bool = False
    options: list[ProductOption] = Field(default_factory=list, max_length=MAX_OPTIONS)
    variants: list[ProductVariantRequest] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_variants_consistency(self) -> "ProductRequest":
        if self.has_variants and not self.variants:
            raise ValueError("Add at least one option and generate variants")
        return self


# ── Product responses ────────────────────────────────────────────────────────

class ProductResponse(_CamelModel):
    id: str
    business_id: str
    name: str
    category: str          # resolved category name, not category_id
    sku: str
    price: float
    compare_at_price: float | None
    stock: int
    status: ProductStatus
    description: str
    images: list[str]
    has_variants: bool
    options: list[ProductOption]
    variants: list[ProductVariantResponse]
    created_at: datetime


class ProductListResponse(_CamelModel):
    products: list[ProductResponse]


class ProductSingleResponse(_CamelModel):
    product: ProductResponse


class BulkDeleteRequest(_CamelModel):
    ids: list[str] = Field(..., min_length=1)


class MessageResponse(_CamelModel):
    message: str


class ImportResultResponse(_CamelModel):
    imported: int


# ── Sync stats (Developers tab) ─────────────────────────────────────────────

class SyncStatsResponse(_CamelModel):
    total_products: int
    active_products: int
    categories: int


# ── Categories (Frontend/docs/API.md: GET/POST/PATCH/DELETE /categories) ─────
# Not called by the product form today (it resolves categories by name on
# the fly), but a first-class resource for whenever a category management
# screen gets built.

class CategoryRequest(_CamelModel):
    """business_id is deliberately NOT here — it must come from
    get_current_user, never from client input."""
    name: str = Field(..., min_length=1, max_length=150)


class CategoryRenameRequest(_CamelModel):
    name: str = Field(..., min_length=1, max_length=150)


class CategoryResponse(_CamelModel):
    id: str
    business_id: str
    name: str


class CategoryListResponse(_CamelModel):
    categories: list[CategoryResponse]


class CategorySingleResponse(_CamelModel):
    category: CategoryResponse


class CategoryDeleteResponse(_CamelModel):
    """Deleting a category doesn't delete its products (ON DELETE SET
    NULL) — it just orphans them. Tell the frontend which ones so it can
    refresh / prompt the owner to re-categorize."""
    message: str
    orphaned_product_ids: list[str]