import { apiClient } from '@/lib/api/client'
import type {
  CreateOrganizationRequest,
  IdentifierResponse,
  Organization,
} from '@/lib/types/organization'

export async function createOrganization(
  body: CreateOrganizationRequest
): Promise<IdentifierResponse> {
  const { data } = await apiClient.post<IdentifierResponse>('/organization', body)
  return data
}

export async function getOrganization(): Promise<Organization> {
  const { data } = await apiClient.get<Organization>('/organization')
  return data
}

export async function updateOrganization(id: string, name: string): Promise<void> {
  await apiClient.put(`/organization/${id}`, { name })
}
