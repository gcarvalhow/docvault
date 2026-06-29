'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useCreateDocument, useDocuments } from '@/lib/hooks/useDocuments'
import { getDocument } from '@/lib/api/documents'
import { CATEGORY_LABELS, STATUS_CONFIG, formatDate } from '@/lib/utils/formatters'
import { canCreateDocument, documentsPageTitle } from '@/lib/utils/permissions'
import { applyApiErrors, isFieldErrors, parseApiError } from '@/lib/utils/errors'
import { Badge } from '@/components/ui/Badge'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { TextArea } from '@/components/ui/TextArea'

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const documentSchema = z.object({
  title: z.string().min(3, 'Mínimo de 3 caracteres').max(200, 'Máximo de 200 caracteres'),
  description: z.string().optional(),
  category: z.enum(['contrato', 'relatorio', 'termo', 'proposta', 'declaracao', 'outro'], {
    message: 'Selecione uma categoria',
  }),
})

type DocumentForm = z.infer<typeof documentSchema>

export default function DocumentsPage() {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const { data: documents, isLoading } = useDocuments()
  const createDocument = useCreateDocument()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DocumentForm>({ resolver: zodResolver(documentSchema) })

  if (!currentUser) return null

  function openDialog() {
    reset()
    setFormError(null)
    setDialogOpen(true)
  }

  async function onSubmit(values: DocumentForm) {
    setFormError(null)
    try {
      const { id } = await createDocument.mutateAsync({
        title: values.title,
        description: values.description || null,
        category: values.category,
      })
      await queryClient.prefetchQuery({
        queryKey: ['documents', id],
        queryFn: () => getDocument(id),
      })
      setDialogOpen(false)
      router.push(`/documents/${id}`)
    } catch (error) {
      const parsed = parseApiError(error)
      if (isFieldErrors(parsed)) {
        applyApiErrors(parsed, setError)
      } else {
        setFormError(parsed)
      }
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">
            {documentsPageTitle(currentUser)}
          </h1>
          {canCreateDocument(currentUser) && (
            <Button onClick={openDialog}>Novo documento</Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-rim bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rim bg-card/60 text-xs uppercase tracking-wider text-slate-500">
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
                    className="cursor-pointer border-b border-rim/40 last:border-0 transition-colors hover:bg-elevated"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      <Link href={`/documents/${doc.id}`} className="block">
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{CATEGORY_LABELS[doc.category]}</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_CONFIG[doc.status].color}>
                        {STATUS_CONFIG[doc.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(doc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-rim bg-panel py-20 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhum documento encontrado</p>
            <p className="mt-1 text-xs text-slate-500">Crie o primeiro documento da sua organização.</p>
            {canCreateDocument(currentUser) && (
              <Button className="mt-4" onClick={openDialog}>
                Novo documento
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Novo documento">
        {formError && (
          <div className="mb-4">
            <Banner tone="error">{formError}</Banner>
          </div>
        )}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            id="title"
            label="Título"
            placeholder="Ex: Contrato de prestação de serviços"
            error={errors.title?.message}
            {...register('title')}
          />
          <TextArea
            id="description"
            label="Descrição (opcional)"
            rows={3}
            placeholder="Descreva o documento brevemente…"
            error={errors.description?.message}
            {...register('description')}
          />
          <Select
            id="category"
            label="Categoria"
            placeholder="Selecione uma categoria…"
            options={categoryOptions}
            error={errors.category?.message}
            {...register('category')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" isLoading={isSubmitting}>
              Criar documento
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
