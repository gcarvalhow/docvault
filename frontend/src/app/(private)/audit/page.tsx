'use client'

import { useState } from 'react'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import { AUDIT_ACTION_LABELS, auditActionLabel, formatDateTime } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import type { AuditLog, AuditLogFilters } from '@/lib/types/audit'

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
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const filters: AuditLogFilters = {
    action: actionFilter || undefined,
    user_email: emailFilter.trim().toLowerCase() || undefined,
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAuditLogs(filters)

  const logs = data?.pages.flat() ?? []

  return (
    <>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-slate-100">Auditoria</h1>

        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-rim bg-card p-4">
          <Select
            id="action-filter"
            label="Ação"
            placeholder="Todas as ações"
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <Input
            id="email-filter"
            label="Email do usuário"
            placeholder="usuario@empresa.com"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
          />
          {(actionFilter || emailFilter) && (
            <Button
              variant="ghost"
              onClick={() => { setActionFilter(''); setEmailFilter('') }}
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
            <div className="overflow-hidden rounded-lg border border-rim bg-panel">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-rim bg-card/60 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data/hora</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Recurso</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer border-b border-rim/40 last:border-0 transition-colors hover:bg-elevated"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-200">{log.user_email}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {auditActionLabel(log.action)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {log.target_type
                          ? `${TARGET_TYPE_LABELS[log.target_type] ?? log.target_type}${
                              log.target_id ? ` #${log.target_id.slice(0, 8)}` : ''
                            }`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {log.ip ?? '—'}
                      </td>
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

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Detalhes do registro"
        width="lg"
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">
                {auditActionLabel(selected.action)}
              </span>
              <span className="text-xs text-slate-500">{formatDateTime(selected.created_at)}</span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-rim bg-canvas p-4 text-xs leading-relaxed text-slate-300">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        )}
      </Dialog>
    </>
  )
}
