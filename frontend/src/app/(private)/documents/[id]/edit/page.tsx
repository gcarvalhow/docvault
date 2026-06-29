'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDocument, useEditDocument } from '@/lib/hooks/useDocuments'
import { canEditDocument } from '@/lib/utils/permissions'
import { CATEGORY_LABELS } from '@/lib/utils/formatters'
import { applyApiErrors, isFieldErrors, parseApiError } from '@/lib/utils/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { Select } from '@/components/ui/Select'
import { Banner } from '@/components/ui/Banner'
import { Spinner } from '@/components/ui/Spinner'

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

export default function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const currentUser = useCurrentUser()
  const { data: document, isLoading } = useDocument(id)
  const editDocument = useEditDocument(id)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DocumentForm>({ resolver: zodResolver(documentSchema) })

  useEffect(() => {
    if (document) {
      reset({
        title: document.title,
        description: document.description ?? '',
        category: document.category,
      })
    }
  }, [document, reset])

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

  if (!canEditDocument(currentUser, document)) {
    return <Banner tone="error">Você não tem permissão para editar este documento.</Banner>
  }

  async function onSubmit(values: DocumentForm) {
    setFormError(null)
    try {
      await editDocument.mutateAsync({
        title: values.title,
        description: values.description || null,
        category: values.category,
      })
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
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-100">Editar documento</h1>

      {formError && (
        <div className="mt-4">
          <Banner tone="error">{formError}</Banner>
        </div>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Input id="title" label="Título" error={errors.title?.message} {...register('title')} />
        <TextArea
          id="description"
          label="Descrição (opcional)"
          rows={4}
          error={errors.description?.message}
          {...register('description')}
        />
        <Select
          id="category"
          label="Categoria"
          options={categoryOptions}
          error={errors.category?.message}
          {...register('category')}
        />
        <div className="mt-2 flex gap-2">
          <Button type="submit" isLoading={isSubmitting}>
            Salvar alterações
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push(`/documents/${id}`)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
