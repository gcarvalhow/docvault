'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { useOrganization } from '@/lib/hooks/useOrganization'
import { Nav } from '@/components/layout/Nav'
import { Spinner } from '@/components/ui/Spinner'

const ADMIN_ONLY_PREFIXES = ['/users', '/audit', '/settings']

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const { currentUser, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { data: organization } = useOrganization(!isLoading && Boolean(currentUser))

  const isAdminOnlyRoute = ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isForbidden = Boolean(currentUser) && isAdminOnlyRoute && currentUser?.role !== 'admin'

  useEffect(() => {
    if (isLoading) return
    if (!currentUser) {
      router.replace('/login')
      return
    }
    if (isForbidden) {
      router.replace('/dashboard')
    }
  }, [isLoading, currentUser, isForbidden, router])

  if (isLoading || !currentUser || isForbidden) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-1">
      <Nav
        role={currentUser.role}
        organizationName={organization?.name}
        userEmail={currentUser.email}
        onLogout={logout}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
