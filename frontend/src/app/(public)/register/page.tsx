'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '@/lib/auth/context'
import { createOrganization } from '@/lib/api/organization'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Banner } from '@/components/ui/Banner'
import { applyApiErrors, getStatus, isFieldErrors, parseApiError } from '@/lib/utils/errors'

const registerSchema = z
  .object({
    organization: z.object({
      name: z.string().min(1, 'Nome é obrigatório').max(150, 'Máximo de 150 caracteres'),
    }),
    user: z.object({
      email: z.string().email('Email inválido'),
      password: z.string().min(1, 'Senha é obrigatória'),
      confirm_password: z.string().min(1, 'Confirmação é obrigatória'),
    }),
  })
  .refine((data) => data.user.password === data.user.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['user', 'confirm_password'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { currentUser, isLoading } = useAuth()
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/dashboard')
    }
  }, [isLoading, currentUser, router])

  async function onSubmit(values: RegisterForm) {
    setFormError(null)
    try {
      await createOrganization(values)
      router.replace('/login?registered=1')
    } catch (error) {
      const status = getStatus(error)
      if (status === 409) {
        const parsed = parseApiError(error)
        const message = typeof parsed === 'string' ? parsed : 'Conflito de dados'
        if (message.includes('organization name')) {
          setError('organization.name', { message: 'Este nome de organização já está em uso' })
        } else if (message.includes('user email')) {
          setError('user.email', { message: 'Este email já está em uso' })
        } else {
          setFormError(message)
        }
        return
      }
      const parsed = parseApiError(error)
      if (isFieldErrors(parsed)) {
        applyApiErrors(parsed, setError)
      } else {
        setFormError(parsed)
      }
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-rim bg-card p-8 shadow-2xl">
        <div className="mb-6">
          <span className="text-2xl font-bold tracking-tight text-brand">DocVault</span>
        </div>

        <h1 className="text-xl font-semibold text-slate-100">Criar organização</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure sua organização e a conta de administrador.
        </p>

        {formError && (
          <div className="mt-4">
            <Banner tone="error">{formError}</Banner>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold text-slate-300">Sua organização</legend>
            <Input
              id="organization.name"
              label="Nome da organização"
              error={errors.organization?.name?.message}
              {...register('organization.name')}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold text-slate-300">
              Sua conta de administrador
            </legend>
            <Input
              id="user.email"
              type="email"
              label="Email"
              autoComplete="email"
              error={errors.user?.email?.message}
              {...register('user.email')}
            />
            <Input
              id="user.password"
              type="password"
              label="Senha"
              autoComplete="new-password"
              error={errors.user?.password?.message}
              {...register('user.password')}
            />
            <Input
              id="user.confirm_password"
              type="password"
              label="Confirmar senha"
              autoComplete="new-password"
              error={errors.user?.confirm_password?.message}
              {...register('user.confirm_password')}
            />
          </fieldset>

          <Button type="submit" isLoading={isSubmitting}>
            Criar organização
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-brand hover:text-brand-muted transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
