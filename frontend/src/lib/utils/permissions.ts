import type { User } from '@/lib/types/identity'
import type { Document, DocumentStatus } from '@/lib/types/documents'

export function canCreateDocument(user: User): boolean {
  return user.role === 'admin' || user.role === 'solicitante'
}

export function canEditDocument(user: User, document: Document): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'solicitante') {
    return document.owner_id === user.id && document.status === 'pendente'
  }
  return false
}

export function canDeleteDocument(user: User, document: Document): boolean {
  return canEditDocument(user, document)
}

export function canChangeStatus(user: User): boolean {
  return user.role === 'admin' || user.role === 'analista'
}

export function canRevertToPending(user: User): boolean {
  return user.role === 'admin'
}

export function availableStatusTargets(user: User): DocumentStatus[] {
  if (user.role === 'admin') {
    return ['pendente', 'em_analise', 'aprovado', 'rejeitado']
  }
  if (user.role === 'analista') {
    return ['em_analise', 'aprovado', 'rejeitado']
  }
  return []
}

export function canAssignAnalyst(user: User): boolean {
  return user.role === 'admin'
}

export function documentsPageTitle(user: User): string {
  if (user.role === 'admin') return 'Todos os documentos'
  if (user.role === 'analista') return 'Fila de revisão'
  return 'Meus documentos'
}
