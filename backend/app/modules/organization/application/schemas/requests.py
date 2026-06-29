from pydantic import BaseModel, EmailStr

from app.core.shared.validators import NonEmptyStr

class CreateOrganizationBody(BaseModel):
    name: NonEmptyStr

class CreateOrganizationAdminBody(BaseModel):
    email: EmailStr
    password: NonEmptyStr
    confirm_password: NonEmptyStr

class CreateOrganizationRequest(BaseModel):
    organization: CreateOrganizationBody
    user: CreateOrganizationAdminBody

class UpdateOrganizationRequest(BaseModel):
    name: NonEmptyStr