import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analista"
    REQUESTER = "solicitante"

# Backward-compatible alias for callers that expect the pluralized name.
UserRoles = UserRole