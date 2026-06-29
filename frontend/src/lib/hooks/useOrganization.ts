import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrganization, updateOrganization } from '@/lib/api/organization'

const organizationKey = ['organization'] as const

export function useOrganization(enabled = true) {
  return useQuery({ queryKey: organizationKey, queryFn: getOrganization, enabled })
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => updateOrganization(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKey })
    },
  })
}
