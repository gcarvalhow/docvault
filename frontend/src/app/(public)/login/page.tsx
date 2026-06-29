'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Banner } from '@/components/ui/Banner'
import { applyApiErrors, getStatus, isFieldErrors, parseApiError } from '@/lib/utils/errors'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const { login, currentUser, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const successMessage = searchParams.get('registered')
    ? 'Organização criada. Faça login para continuar.'
    : null

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/dashboard')
    }
  }, [isLoading, currentUser, router])

  async function onSubmit(values: LoginForm) {
    setFormError(null)
    try {
      await login(values.email, values.password)
      router.replace('/dashboard')
    } catch (error) {
      const status = getStatus(error)
      if (status === 401) {
        setFormError('Email ou senha incorretos')
        return
      }
      if (status === 429) {
        setIsRateLimited(true)
        setFormError('Muitas tentativas. Tente novamente em 15 minutos.')
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
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Entrar no DocVault</h1>
        <p className="mt-1 text-sm text-slate-500">Acesse sua conta para continuar.</p>

        {successMessage && (
          <div className="mt-4">
            <Banner tone="success">{successMessage}</Banner>
          </div>
        )}

        {formError && (
          <div className="mt-4">
            <Banner tone="error">{formError}</Banner>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            id="email"
            type="email"
            label="Email"
            autoComplete="email"
            disabled={isRateLimited}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="password"
            type="password"
            label="Senha"
            autoComplete="current-password"
            disabled={isRateLimited}
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" isLoading={isSubmitting} disabled={isRateLimited} className="mt-2">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Ainda não tem uma organização?{' '}
          <Link href="/register" className="font-medium text-slate-900 hover:underline">
            Criar organização
          </Link>
        </p>
      </div>
    </div>
  )
}
