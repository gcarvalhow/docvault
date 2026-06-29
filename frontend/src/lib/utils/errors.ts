import { isAxiosError } from 'axios'
import type { UseFormSetError, FieldValues, Path } from 'react-hook-form'

export interface ApiFieldError {
  field: string
  message: string
}

type ApiErrorBody = { detail: string } | { detail: ApiFieldError[] }

export function parseApiError(error: unknown): string | ApiFieldError[] {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as ApiErrorBody
    if (Array.isArray(data.detail)) return data.detail
    return data.detail ?? 'Erro inesperado'
  }
  return 'Erro de conexão'
}

export function isFieldErrors(error: string | ApiFieldError[]): error is ApiFieldError[] {
  return Array.isArray(error)
}

export function getStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) return error.response?.status
  return undefined
}

export function applyApiErrors<T extends FieldValues>(
  errors: ApiFieldError[],
  setError: UseFormSetError<T>
): void {
  errors.forEach(({ field, message }) => {
    setError(field as Path<T>, { message })
  })
}
