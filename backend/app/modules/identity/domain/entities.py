from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import Boolean, DateTime, ForeignKey, String

from app.core.domain import Model

class RefreshToken(Model):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def revoke(self, revoked_at: datetime) -> None:
        self.is_revoked = True
        self.revoked_at = revoked_at

    def is_valid(self) -> bool:
        return not self.is_revoked and self.expires_at > datetime.now(timezone.utc)