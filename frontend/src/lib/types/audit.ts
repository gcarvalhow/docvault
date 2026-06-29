export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_CREATED'
  | 'USER_DEACTIVATED'
  | 'DOC_CREATED'
  | 'DOC_EDITED'
  | 'DOC_STATUS_CHANGED'
  | 'DOC_DELETED'
  | 'ACCESS_DENIED'

export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string
  action: AuditAction | string
  target_type: 'user' | 'document' | null
  target_id: string | null
  detail: string | null
  ip: string | null
  created_at: string
}

export interface AuditLogFilters {
  action?: string
  user_email?: string
}
