from uuid import UUID
from fastapi import HTTPException

def assert_same_tenant(resource_org_id: UUID, user_org_id: UUID) -> None:
    if resource_org_id != user_org_id:
        raise HTTPException(status_code=404, detail="Not found")