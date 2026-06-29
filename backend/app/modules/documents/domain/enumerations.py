import enum

class DocumentStatus(str, enum.Enum):
    PENDING   = "pendente"
    IN_REVIEW = "em_analise"
    APPROVED  = "aprovado"
    REJECTED  = "rejeitado"

class DocumentCategory(str, enum.Enum):
    CONTRACT    = "contrato"
    REPORT      = "relatorio"
    TERM        = "termo"
    PROPOSAL    = "proposta"
    DECLARATION = "declaracao"
    OTHER       = "outro"