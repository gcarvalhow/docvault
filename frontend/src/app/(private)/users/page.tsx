'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useDeleteUser, useUsers } from '@/lib/hooks/useUsers'
import { ROLE_LABELS, formatDate } from '@/lib/utils/formatters'
import { getStatus, parseApiError } from '@/lib/utils/errors'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Spinner } from '@/components/ui/Spinner'
import { Banner } from '@/components/ui/Banner'
import type { User } from '@/lib/types/identity'

export default function UsersPage() {
  const currentUser = useCurrentUser()
  const { data: users, isLoading } = useUsers(true)
  const deleteUser = useDeleteUser()
  const [target, setTarget] = useState<User | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>

      {errorMessage && <Banner tone="error">{errorMessage}</Banner>}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
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
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3">
                    <Badge color={user.is_active ? 'green' : 'gray'}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {currentUser?.role === 'admin' &&
                      user.id !== currentUser.id &&
                      user.is_active && (
                        <Button variant="danger" onClick={() => setTarget(user)}>
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

      <ConfirmModal
        open={Boolean(target)}
        title="Desativar usuário"
        description={`Tem certeza que deseja desativar "${target?.email}"?`}
        confirmLabel="Desativar"
        isLoading={deleteUser.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setTarget(null)}
      />
    </div>
  )
}
