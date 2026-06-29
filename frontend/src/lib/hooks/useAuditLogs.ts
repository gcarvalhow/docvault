import { useInfiniteQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/lib/api/audit'
import type { AuditLogFilters } from '@/lib/types/audit'

const PAGE_SIZE = 50

export function useAuditLogs(filters: AuditLogFilters) {
  return useInfiniteQuery({
    queryKey: ['audit-logs', filters],
    queryFn: ({ pageParam }) =>
      getAuditLogs({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  })
}
