from uuid import uuid4
from typing import TYPE_CHECKING
from datetime import datetime, timezone

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.domain import Model

if TYPE_CHECKING:
    from app.modules.identity.domain.aggregates import User

class Organization(Model):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    users: Mapped[list["User"]] = relationship("User", lazy="selectin")

    def __init__(self, **kwargs):
        kwargs.setdefault("id", uuid4())
        kwargs.setdefault("created_at", datetime.now(timezone.utc))

        Model.__init__(self, **kwargs)