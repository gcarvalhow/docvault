from uuid import UUID, uuid4
from datetime import datetime, timezone

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import Enum as SA_Enum, ForeignKey, String, Text

from app.core.domain import Model
from app.modules.documents.domain.enumerations import DocumentCategory, DocumentStatus

class Document(Model):
    __tablename__ = "documents"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[DocumentCategory] = mapped_column(
        SA_Enum(DocumentCategory, name="documentcategory", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    status: Mapped[DocumentStatus] = mapped_column(
        SA_Enum(DocumentStatus, name="documentstatus", values_callable=lambda x: [e.value for e in x]),
        default=DocumentStatus.PENDING,
        nullable=False,
    )

    owner_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    analyst_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __init__(self, **kwargs):
        kwargs.setdefault("id", uuid4())
        kwargs.setdefault("created_at", datetime.now(timezone.utc))
        Model.__init__(self, **kwargs)

    @classmethod
    def create(cls, title: str, category: DocumentCategory, owner_id: UUID, description: str | None = None) -> "Document":
        return cls(
            title=title,
            description=description,
            category=category,
            status=DocumentStatus.PENDING,
            owner_id=owner_id,
        )

    def edit(self, title: str, category: DocumentCategory, description: str | None) -> None:
        self.title = title
        self.category = category
        self.description = description

    def change_status(self, new_status: DocumentStatus, analyst_id: UUID | None, comment: str | None) -> None:
        self.status = new_status
        self.analyst_id = analyst_id
        self.comment = comment

    def assign_analyst(self, analyst_id: UUID | None) -> None:
        self.analyst_id = analyst_id