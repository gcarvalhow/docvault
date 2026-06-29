'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useOrganization, useUpdateOrganization } from '@/lib/hooks/useOrganization'
import { applyApiErrors, isFieldErrors, parseApiError } from '@/lib/utils/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Banner } from '@/components/ui/Banner'
import { Spinner } from '@/components/ui/Spinner'

const settingsSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(150, 'Máximo de 150 caracteres'),
})

type SettingsForm = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const currentUser = useCurrentUser()
  const { data: organization, isLoading } = useOrganization()
  const updateOrganization = useUpdateOrganization(currentUser?.organization_id ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema) })

  useEffect(() => {
    if (organization) {
      reset({ name: organization.name })
    }
  }, [organization, reset])

  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  async function onSubmit(values: SettingsForm) {
    setFormError(null)
    setSuccess(false)
    try {
      await updateOrganization.mutateAsync(values.name)
      setSuccess(true)
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
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-slate-100">Configurações</h1>
      <p className="mt-1 text-sm text-slate-400">Nome da organização.</p>

      {success && (
        <div className="mt-4">
          <Banner tone="success">Organização atualizada com sucesso.</Banner>
        </div>
      )}
      {formError && (
        <div className="mt-4">
          <Banner tone="error">{formError}</Banner>
        </div>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          id="name"
          label="Nome da organização"
          error={errors.name?.message}
          {...register('name')}
        />
        <div>
          <Button type="submit" isLoading={isSubmitting}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  )
}
