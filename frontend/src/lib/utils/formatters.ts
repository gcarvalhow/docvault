import type { UserRole } from '@/lib/types/identity'
import type { DocumentStatus, DocumentCategory } from '@/lib/types/documents'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  analista: 'Analista',
  solicitante: 'Solicitante',
}

export const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: 'yellow' | 'blue' | 'green' | 'red' }> = {
  pendente: { label: 'Pendente', color: 'yellow' },
  em_analise: { label: 'Em análise', color: 'blue' },
  aprovado: { label: 'Aprovado', color: 'green' },
  rejeitado: { label: 'Rejeitado', color: 'red' },
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contrato: 'Contrato',
  relatorio: 'Relatório',
  termo: 'Termo',
  proposta: 'Proposta',
  declaracao: 'Declaração',
  outro: 'Outro',
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Login realizado',
  LOGIN_FAILED: 'Tentativa de login com falha',
  LOGOUT: 'Logout',
  USER_CREATED: 'Usuário criado',
  USER_DEACTIVATED: 'Usuário desativado',
  DOC_CREATED: 'Documento criado',
  DOC_EDITED: 'Documento editado',
  DOC_STATUS_CHANGED: 'Status do documento alterado',
  DOC_DELETED: 'Documento excluído',
  DOC_ANALYST_ASSIGNED: 'Analista atribuído ao documento',
  ACCESS_DENIED: 'Acesso negado',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso))
}
