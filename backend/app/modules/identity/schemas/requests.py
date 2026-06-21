from uuid import UUID
from pydantic import BaseModel, EmailStr, model_validator

from app.core.shared.validators import NonEmptyStr
from app.modules.identity.domain.enumerations import UserRole

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