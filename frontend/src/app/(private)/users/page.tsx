'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDeleteUser, useInviteUser, useUsers } from '@/lib/hooks/useUsers'
import { ROLE_LABELS, formatDate } from '@/lib/utils/formatters'
import { getStatus, parseApiError } from '@/lib/utils/errors'
import { Badge } from '@/components/ui/Badge'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import type { User } from '@/lib/types/identity'

const roleOptions = [
  { value: 'analista', label: 'Analista' },
  { value: 'solicitante', label: 'Solicitante' },
  { value: 'admin', label: 'Administrador' },
]

const inviteSchema = z
  .object({
    email: z.string().email('Email inválido'),
    role: z.enum(['admin', 'analista', 'solicitante'], { message: 'Selecione um papel' }),
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    confirm_password: z.string().min(1, 'Confirmação obrigatória'),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['confirm_password'],
  })

type InviteForm = z.infer<typeof inviteSchema>

export default function UsersPage() {
  const currentUser = useCurrentUser()
  const { data: users, isLoading } = useUsers(true)
  const deleteUser = useDeleteUser()
  const inviteUser = useInviteUser()
  const [target, setTarget] = useState<User | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  function openInvite() {
    reset()
    setInviteSuccess(null)
    setInviteOpen(true)
  }

  async function onInviteSubmit(values: InviteForm) {
    try {
      await inviteUser.mutateAsync(values)
      setInviteSuccess(`Usuário ${values.email} convidado com sucesso.`)
      reset()
    } catch (error) {
      const status = getStatus(error)
      if (status === 409) {
        setError('email', { message: 'Este email já está em uso' })
        return
      }
      const parsed = parseApiError(error)
      if (typeof parsed === 'string') {
        setError('root', { message: parsed })
      }
    }
  }

  async function handleConfirmDeactivate() {
    if (!target) return
    setErrorMessage(null)
    try {
      await deleteUser.mutateAsync(target.id)
      setTarget(null)
    } catch (error) {
      const status = getStatus(error)
      const parsed = parseApiError(error)
      setErrorMessage(
        status === 400 && typeof parsed === 'string'
          ? 'Não é possível desativar a própria conta.'
          : typeof parsed === 'string'
            ? parsed
            : 'Erro ao desativar usuário'
      )
      setTarget(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">Usuários</h1>
          {currentUser?.role === 'admin' && (
            <Button onClick={openInvite}>Convidar usuário</Button>
          )}
        </div>

        {errorMessage && <Banner tone="error">{errorMessage}</Banner>}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-rim bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rim bg-card/60 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id} className="border-b border-rim/40 last:border-0 transition-colors hover:bg-elevated">
                    <td className="px-4 py-3 font-medium text-slate-100">{user.email}</td>
                    <td className="px-4 py-3 text-slate-400">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-3">
                      <Badge color={user.is_active ? 'green' : 'gray'}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {currentUser?.role === 'admin' &&
                        user.id !== currentUser.id &&
                        user.is_active && (
                          <Button variant="ghost" onClick={() => setTarget(user)}>
                            Desativar
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Convidar usuário">
        {inviteSuccess ? (
          <div className="flex flex-col gap-4">
            <Banner tone="success">{inviteSuccess}</Banner>
            <div className="flex gap-2">
              <Button onClick={openInvite}>Convidar outro</Button>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onInviteSubmit)}>
            {errors.root && (
              <Banner tone="error">{errors.root.message}</Banner>
            )}
            <Input
              id="invite-email"
              type="email"
              label="Email"
              placeholder="colaborador@empresa.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Select
              id="invite-role"
              label="Papel"
              placeholder="Selecione um papel…"
              options={roleOptions}
              error={errors.role?.message}
              {...register('role')}
            />
            <Input
              id="invite-password"
              type="password"
              label="Senha inicial"
              placeholder="Mínimo 8 caracteres"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              id="invite-confirm"
              type="password"
              label="Confirmar senha"
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />
            <div className="mt-1 flex gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                Convidar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmModal
        open={Boolean(target)}
        title="Desativar usuário"
        description={`Tem certeza que deseja desativar "${target?.email}"?`}
        confirmLabel="Desativar"
        isLoading={deleteUser.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}
