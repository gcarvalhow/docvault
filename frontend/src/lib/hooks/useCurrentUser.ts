import { useAuth } from '@/lib/auth/context'
import type { User } from '@/lib/types/identity'

export function useCurrentUser(): User | null {
  return useAuth().currentUser
}
