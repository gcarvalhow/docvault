import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteUser, getUser, getUsers, inviteUser } from '@/lib/api/users'
import type { InviteUserRequest } from '@/lib/types/identity'

const usersKey = (includeInactive: boolean) => ['users', { includeInactive }] as const

export function useUsers(includeInactive = false) {
  return useQuery({
    queryKey: usersKey(includeInactive),
    queryFn: () => getUsers(includeInactive),
  })
}

export function useUser(id: string | null | undefined) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id as string),
    enabled: Boolean(id),
    retry: false,
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: InviteUserRequest) => inviteUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
