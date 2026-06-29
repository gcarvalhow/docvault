export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface CreateOrganizationRequest {
  organization: {
    name: string
  }
  user: {
    email: string
    password: string
    confirm_password: string
  }
}

export interface UpdateOrganizationRequest {
  name: string
}

export interface IdentifierResponse {
  id: string
}
