'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateDocument } from '@/lib/hooks/useDocuments'
import { getDocument } from '@/lib/api/documents'
import { CATEGORY_LABELS } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { Select } from '@/components/ui/Select'
import { Banner } from '@/components/ui/Banner'
import { applyApiErrors, isFieldErrors, parseApiError } from '@/lib/utils/errors'

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

export default function NewDocumentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const createDocument = useCreateDocument()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DocumentForm>({ resolver: zodResolver(documentSchema) })

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
      <h1 className="text-2xl font-semibold text-slate-100">Novo documento</h1>

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
          placeholder="Selecione…"
          options={categoryOptions}
          error={errors.category?.message}
          {...register('category')}
        />
        <div className="mt-2 flex gap-2">
          <Button type="submit" isLoading={isSubmitting}>
            Criar documento
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/documents')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
