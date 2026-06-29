from __future__ import annotations

from app.modules.identity.domain.enumerations import UserRole

PENDING_DOCUMENT_STATUS = "pendente"

def normalize_role(role: UserRole | str) -> UserRole:
    if isinstance(role, UserRole):
        return role

    return UserRole(role)

def has_role(role: UserRole | str, expected: UserRole | str) -> bool:
    return normalize_role(role) == normalize_role(expected)

def has_any_role(role: UserRole | str, *expected_roles: UserRole | str) -> bool:
    current_role = normalize_role(role)
    return any(current_role == normalize_role(expected) for expected in expected_roles)

def is_admin(role: UserRole | str) -> bool:
    return has_role(role, UserRole.ADMIN)

def is_analyst(role: UserRole | str) -> bool:
    return has_role(role, UserRole.ANALYST)

def is_requester(role: UserRole | str) -> bool:
    return has_role(role, UserRole.REQUESTER)

def can_manage_users(role: UserRole | str) -> bool:
    return is_admin(role)

def can_view_audit_logs(role: UserRole | str) -> bool:
    return is_admin(role)

def can_create_document(role: UserRole | str) -> bool:
    return has_any_role(role, UserRole.ADMIN, UserRole.REQUESTER)

def can_view_all_documents(role: UserRole | str) -> bool:
    return has_any_role(role, UserRole.ADMIN, UserRole.ANALYST)

def can_view_document(role: UserRole | str, *, is_owner: bool) -> bool:
    return is_owner or can_view_all_documents(role)

def can_edit_document(role: UserRole | str, *, is_owner: bool, status: str) -> bool:
    if is_admin(role):
        return True

    return is_owner and status == PENDING_DOCUMENT_STATUS

def can_delete_document(role: UserRole | str, *, is_owner: bool, status: str) -> bool:
    if is_admin(role):
        return True

    return is_owner and status == PENDING_DOCUMENT_STATUS

def can_change_document_status(role: UserRole | str) -> bool:
    return has_any_role(role, UserRole.ADMIN, UserRole.ANALYST)

def can_assign_analyst(role: UserRole | str) -> bool:
    return is_admin(role)