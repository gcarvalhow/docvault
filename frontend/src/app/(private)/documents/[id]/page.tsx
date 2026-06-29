'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useChangeDocumentStatus, useDeleteDocument, useDocument } from '@/lib/hooks/useDocuments'
import { useUser } from '@/lib/hooks/useUsers'
import { CATEGORY_LABELS, STATUS_CONFIG, formatDateTime } from '@/lib/utils/formatters'
import {
  availableStatusTargets,
  canChangeStatus,
  canDeleteDocument,
  canEditDocument,
} from '@/lib/utils/permissions'
import { parseApiError } from '@/lib/utils/errors'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TextArea } from '@/components/ui/TextArea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Spinner } from '@/components/ui/Spinner'
import { Banner } from '@/components/ui/Banner'
import type { DocumentStatus } from '@/lib/types/documents'

const STATUS_SELECT_LABELS: Record<DocumentStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const currentUser = useCurrentUser()
  const { data: document, isLoading } = useDocument(id)
  const { data: analyst } = useUser(document?.analyst_id)
  const { data: owner } = useUser(document?.owner_id)
  const changeStatus = useChangeDocumentStatus(id)
  const deleteDocument = useDeleteDocument()

  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | ''>('')
  const [comment, setComment] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!document) {
    return <p className="text-sm text-slate-400">Documento não encontrado.</p>
  }

  const statusOptions = availableStatusTargets(currentUser).map((status) => ({
    value: status,
    label: STATUS_SELECT_LABELS[status],
  }))

  async function handleStatusSubmit() {
    if (!selectedStatus || !currentUser) return
    setStatusError(null)
    try {
      await changeStatus.mutateAsync({
        status: selectedStatus,
        analyst_id: currentUser.id,
        comment: comment || null,
      })
      setSelectedStatus('')
      setComment('')
    } catch (error) {
      const parsed = parseApiError(error)
      setStatusError(typeof parsed === 'string' ? parsed : 'Erro ao atualizar status')
    }
  }

  async function handleDelete() {
    if (!document) return
    await deleteDocument.mutateAsync(document.id)
    router.push('/documents')
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{document.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {CATEGORY_LABELS[document.category]} · Criado em {formatDateTime(document.created_at)}
          </p>
        </div>
        <Badge color={STATUS_CONFIG[document.status].color}>
          {STATUS_CONFIG[document.status].label}
        </Badge>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-rim bg-card p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Solicitante</dt>
          <dd className="mt-1 text-sm text-slate-100">{owner?.email ?? document.owner_id}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Analista</dt>
          <dd className="mt-1 text-sm text-slate-100">
            {document.analyst_id ? analyst?.email ?? '—' : '—'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Descrição</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-100">
            {document.description ?? '—'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Comentário</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-100">
            {document.comment ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Atualizado em</dt>
          <dd className="mt-1 text-sm text-slate-100">{formatDateTime(document.updated_at)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-2">
        {canEditDocument(currentUser, document) && (
          <Link href={`/documents/${document.id}/edit`}>
            <Button variant="secondary">Editar</Button>
          </Link>
        )}
        {canDeleteDocument(currentUser, document) && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Excluir
          </Button>
        )}
      </div>

      {canChangeStatus(currentUser) && (
        <div className="mt-8 rounded-lg border border-rim bg-card p-6">
          <h2 className="text-base font-semibold text-slate-100">Alterar status</h2>

          {statusError && (
            <div className="mt-3">
              <Banner tone="error">{statusError}</Banner>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <Select
              id="status"
              label="Novo status"
              placeholder="Selecione…"
              options={statusOptions}
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as DocumentStatus)}
            />
            <TextArea
              id="comment"
              label={
                selectedStatus === 'rejeitado'
                  ? 'Comentário (recomendado ao rejeitar)'
                  : 'Comentário (opcional)'
              }
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div>
              <Button
                onClick={handleStatusSubmit}
                isLoading={changeStatus.isPending}
                disabled={!selectedStatus}
              >
                Confirmar alteração
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Excluir documento"
        description={`Tem certeza que deseja excluir "${document.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isLoading={deleteDocument.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
