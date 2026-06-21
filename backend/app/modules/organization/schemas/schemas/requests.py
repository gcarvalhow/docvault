from pydantic import BaseModel

from app.core.shared.validators import NonEmptyStr
from app.modules.identity.schemas.requests import CreateUserRequest

class CreateOrganizationBody(BaseModel):
    name: NonEmptyStr

class CreateOrganizationRequest(BaseModel):
    organization: CreateOrganizationBody
    user: CreateUserRequest