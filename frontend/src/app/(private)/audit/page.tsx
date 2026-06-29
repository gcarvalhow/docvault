'use client'

import { useState } from 'react'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import { AUDIT_ACTION_LABELS, auditActionLabel, formatDateTime } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import type { AuditLogFilters } from '@/lib/types/audit'

const actionOptions = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: 'Usuário',
  document: 'Documento',
}

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const filters: AuditLogFilters = {
    action: actionFilter || undefined,
    user_email: emailFilter.trim().toLowerCase() || undefined,
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAuditLogs(filters)

  const logs = data?.pages.flat() ?? []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Auditoria</h1>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <Select
          id="action-filter"
          label="Ação"
          placeholder="Todas as ações"
          options={actionOptions}
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
        />
        <Input
          id="email-filter"
          label="Email do usuário"
          placeholder="usuario@empresa.com"
          value={emailFilter}
          onChange={(event) => setEmailFilter(event.target.value)}
        />
        {(actionFilter || emailFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setActionFilter('')
              setEmailFilter('')
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data/hora</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Recurso afetado</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{log.user_email}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{auditActionLabel(log.action)}</p>
                      {log.detail && (
                        <p className="mt-0.5 text-xs text-slate-400">{log.detail}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.target_type
                        ? `${TARGET_TYPE_LABELS[log.target_type] ?? log.target_type}${
                            log.target_id ? ` #${log.target_id.slice(0, 8)}` : ''
                          }`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">
                Nenhum registro encontrado.
              </p>
            )}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => fetchNextPage()}
                isLoading={isFetchingNextPage}
              >
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
