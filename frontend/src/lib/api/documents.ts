import { apiClient } from '@/lib/api/client'
import type {
  AssignAnalystRequest,
  ChangeStatusRequest,
  CreateDocumentRequest,
  Document,
  EditDocumentRequest,
} from '@/lib/types/documents'
import type { IdentifierResponse } from '@/lib/types/organization'

export async function createDocument(body: CreateDocumentRequest): Promise<IdentifierResponse> {
  const { data } = await apiClient.post<IdentifierResponse>('/documents', body)
  return data
}

export async function getDocuments(): Promise<Document[]> {
  const { data } = await apiClient.get<Document[]>('/documents')
  return data
}

export async function getDocument(id: string): Promise<Document> {
  const { data } = await apiClient.get<Document>(`/documents/${id}`)
  return data
}

export async function editDocument(id: string, body: EditDocumentRequest): Promise<void> {
  await apiClient.put(`/documents/${id}`, body)
}

export async function changeDocumentStatus(
  id: string,
  body: ChangeStatusRequest
): Promise<void> {
  await apiClient.patch(`/documents/${id}/status`, body)
}

export async function assignAnalyst(id: string, body: AssignAnalystRequest): Promise<void> {
  await apiClient.patch(`/documents/${id}/analyst`, body)
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`)
}
