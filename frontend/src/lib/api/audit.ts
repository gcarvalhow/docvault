import { apiClient } from '@/lib/api/client'
import type { AuditLog, AuditLogFilters } from '@/lib/types/audit'

interface GetAuditLogsParams extends AuditLogFilters {
  limit: number
  offset: number
}

export async function getAuditLogs(params: GetAuditLogsParams): Promise<AuditLog[]> {
  const { data } = await apiClient.get<AuditLog[]>('/audit/logs', { params })
  return data
}
