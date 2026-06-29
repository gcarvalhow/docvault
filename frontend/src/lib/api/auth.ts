import { apiClient } from '@/lib/api/client'
import type { LoginRequest, TokenResponse } from '@/lib/types/identity'

export async function login(body: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/identity/auth/login', body)
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/identity/auth/logout')
}

export async function refresh(): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/identity/auth/refresh')
  return data
}
