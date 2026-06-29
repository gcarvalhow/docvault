'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types/identity'

interface NavLinkConfig {
  href: string
  label: string
  adminOnly: boolean
}

const LINKS: NavLinkConfig[] = [
  { href: '/dashboard', label: 'Dashboard', adminOnly: false },
  { href: '/documents', label: 'Documentos', adminOnly: false },
  { href: '/users', label: 'Usuários', adminOnly: true },
  { href: '/audit', label: 'Auditoria', adminOnly: true },
  { href: '/settings', label: 'Configurações', adminOnly: true },
]

interface NavProps {
  role: UserRole
  organizationName?: string
  userEmail: string
  onLogout: () => void
}

export function Nav({ role, organizationName, userEmail, onLogout }: NavProps) {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Organização</p>
        <p className="truncate text-sm font-semibold text-slate-900">
          {organizationName ?? '—'}
        </p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {LINKS.filter((link) => !link.adminOnly || role === 'admin').map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <p className="truncate text-sm text-slate-600">{userEmail}</p>
        <button
          onClick={onLogout}
          className="mt-2 text-sm font-medium text-slate-900 hover:underline"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
