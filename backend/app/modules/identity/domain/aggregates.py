from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SA_Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.domain import Model
from app.modules.identity.domain.entities import RefreshToken
from app.modules.identity.domain.enumerations import UserRole

if TYPE_CHECKING:
    from app.modules.organization.domain.aggregates import Organization

class User(Model):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    organization_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    role: Mapped[UserRole] = mapped_column(
        SA_Enum(UserRole, name="userrole", values_callable=lambda x: [e.value for e in x]),
        default=UserRole.REQUESTER,
        nullable=False,
    )

    created_by: Mapped[str | None] = mapped_column(PG_UUID(as_uuid=False), nullable=True)
    security_stamp: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), default=uuid4, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", lazy="selectin")
    refresh_tokens: Mapped[list[RefreshToken]] = relationship("RefreshToken", lazy="selectin")

    def __init__(self, **kwargs):
        kwargs.setdefault("id", uuid4())
        kwargs.setdefault("created_at", datetime.now(timezone.utc))

        Model.__init__(self, **kwargs)

    def deactivate(self) -> None:
        self.revoke_all_refresh_tokens()
        self.is_active = False

    def logout(self) -> None:
        self.revoke_all_refresh_tokens()
        self.regenerate_stamp()

    def add_refresh_token(self, token_hash: str, expires_at: datetime) -> UUID:
        token_id = uuid4()

        refresh_token = RefreshToken(id=token_id, user_id=self.id, token_hash=token_hash, expires_at=expires_at)
        self.refresh_tokens.append(refresh_token)

        return token_id

    def revoke_refresh_token(self, token_id: UUID) -> None:
        token = next((t for t in self.refresh_tokens if t.id == token_id), None)
        if token and token.is_valid():
            token.revoke(datetime.now(timezone.utc))

    def revoke_all_refresh_tokens(self) -> None:
        for token in self.refresh_tokens:
            if token.is_valid():
                self.revoke_refresh_token(token.id)
    
    def regenerate_stamp(self) -> None:
        new_stamp = uuid4()
        self.security_stamp = new_stamp