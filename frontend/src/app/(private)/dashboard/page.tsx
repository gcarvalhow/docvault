'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDocuments } from '@/lib/hooks/useDocuments'
import { ROLE_LABELS, STATUS_CONFIG } from '@/lib/utils/formatters'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

export default function DashboardPage() {
  const currentUser = useCurrentUser()
  const { data: documents, isLoading } = useDocuments()

  const summary = (documents ?? []).reduce<Record<string, number>>((acc, doc) => {
    acc[doc.status] = (acc[doc.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Olá, {currentUser?.email}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Papel: {currentUser ? ROLE_LABELS[currentUser.role] : '—'}
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Resumo de documentos</h2>
          <Link href="/documents" className="text-sm font-medium text-slate-700 hover:underline">
            Ver todos
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-4 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <div
                key={status}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <Badge color={config.color}>{config.label}</Badge>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {summary[status] ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
