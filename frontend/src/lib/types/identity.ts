export type UserRole = 'admin' | 'analista' | 'solicitante'

export interface User {
  id: string
  email: string
  role: UserRole
  organization_id: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
}

export interface LoginRequest {
  email: string
  password: string
}
