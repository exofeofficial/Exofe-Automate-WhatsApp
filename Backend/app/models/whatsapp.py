from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    """Base model that accepts camelCase JSON and exposes snake_case attrs."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ConnectWhatsAppRequest(_CamelModel):
    # Embedded Signup path: frontend sends the authorization code plus
    # the phone_number_id/waba_id it already got from Meta's postMessage
    # event, and the server exchanges the code for a token itself.
    code: str | None = None
    # Manual setup path: the business owner already has their own
    # permanent access token from their own Meta app, no exchange needed.
    access_token: str | None = None
    phone_number_id: str
    business_account_id: str

    @model_validator(mode="after")
    def _require_code_or_token(self) -> "ConnectWhatsAppRequest":
        if not self.code and not self.access_token:
            raise ValueError("Either code or accessToken is required")
        return self


class WhatsAppStatusResponse(_CamelModel):
    connected: bool
    whatsapp_number: str | None
    connected_at: str | None
