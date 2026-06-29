from uuid import UUID
from pydantic import BaseModel

class IdentifierResponse(BaseModel):
    id: UUID