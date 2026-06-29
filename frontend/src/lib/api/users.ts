import { apiClient } from '@/lib/api/client'
import type { InviteUserRequest, User } from '@/lib/types/identity'

export async function getUsers(includeInactive = false): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/identity/users', {
    params: { include_inactive: includeInactive },
  })
  return data
}

export async function getUser(id: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/identity/users/${id}`)
  return data
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/identity/users/${id}`)
}

export async function inviteUser(body: InviteUserRequest): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/identity/users', body)
  return data
}
