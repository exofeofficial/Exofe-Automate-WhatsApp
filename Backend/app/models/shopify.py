from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ShopifyInstallRequest(_CamelModel):
    shop: str  # e.g. "my-store.myshopify.com"


class ShopifyInstallResponse(_CamelModel):
    install_url: str


class ShopifyStatusResponse(_CamelModel):
    connected: bool
    shop_domain: str | None
    connected_at: str | None


class ShopifySyncResponse(_CamelModel):
    synced: int
