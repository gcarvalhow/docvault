export type DocumentStatus = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado'

export type DocumentCategory =
  | 'contrato'
  | 'relatorio'
  | 'termo'
  | 'proposta'
  | 'declaracao'
  | 'outro'

export interface Document {
  id: string
  title: string
  description: string | null
  category: DocumentCategory
  status: DocumentStatus
  owner_id: string
  analyst_id: string | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface CreateDocumentRequest {
  title: string
  description: string | null
  category: DocumentCategory
}

export interface EditDocumentRequest {
  title: string
  description: string | null
  category: DocumentCategory
}

export interface ChangeStatusRequest {
  status: DocumentStatus
  analyst_id: string | null
  comment: string | null
}
