from uuid import UUID
from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, StringConstraints, model_validator

from app.core.shared.validators import NonEmptyStr
from app.modules.identity.domain.enumerations import UserRole

Password = Annotated[str, StringConstraints(strip_whitespace=True, min_length=8)]

class CreateUserRequest(BaseModel):
    email: EmailStr
    organization_id: UUID
    role: UserRole
    password: NonEmptyStr
    confirm_password: NonEmptyStr

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("passwords do not match")
        return self

class InviteUserRequest(BaseModel):
    email: EmailStr
    role: UserRole
    password: Password
    confirm_password: Password

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("passwords do not match")
        return self

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)