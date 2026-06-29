'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDocuments } from '@/lib/hooks/useDocuments'
import { CATEGORY_LABELS, STATUS_CONFIG, formatDate } from '@/lib/utils/formatters'
import { canCreateDocument, documentsPageTitle } from '@/lib/utils/permissions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export default function DocumentsPage() {
  const currentUser = useCurrentUser()
  const { data: documents, isLoading } = useDocuments()

  if (!currentUser) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {documentsPageTitle(currentUser)}
        </h1>
        {canCreateDocument(currentUser) && (
          <Link href="/documents/new">
            <Button>Novo documento</Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/documents/${doc.id}`} className="block">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{CATEGORY_LABELS[doc.category]}</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_CONFIG[doc.status].color}>
                      {STATUS_CONFIG[doc.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(doc.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-slate-500">
          Nenhum documento encontrado.
        </p>
      )}
    </div>
  )
}
