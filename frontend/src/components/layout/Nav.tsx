'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types/identity'

interface NavLinkConfig {
  href: string
  label: string
  adminOnly: boolean
  icon: React.ReactNode
}

function IconDashboard() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconAudit() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

const LINKS: NavLinkConfig[] = [
  { href: '/dashboard', label: 'Dashboard', adminOnly: false, icon: <IconDashboard /> },
  { href: '/documents', label: 'Documentos', adminOnly: false, icon: <IconDocument /> },
  { href: '/users', label: 'Usuários', adminOnly: true, icon: <IconUsers /> },
  { href: '/audit', label: 'Auditoria', adminOnly: true, icon: <IconAudit /> },
  { href: '/settings', label: 'Configurações', adminOnly: true, icon: <IconSettings /> },
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-rim bg-panel px-3 py-5">
      <div className="px-3 pb-5 border-b border-rim/50">
        <span className="text-lg font-bold tracking-tight text-brand">DocVault</span>
        <p className="mt-2 truncate text-xs font-medium text-slate-500">{organizationName ?? '—'}</p>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-0.5">
        {LINKS.filter((link) => !link.adminOnly || role === 'admin').map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-slate-500 hover:bg-elevated hover:text-slate-200'
              }`}
            >
              <span className={`shrink-0 transition-colors ${isActive ? 'text-brand' : 'text-slate-600 group-hover:text-slate-300'}`}>
                {link.icon}
              </span>
              {link.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 border-t border-rim/50 pt-4 px-1">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
            {userEmail[0].toUpperCase()}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{userEmail}</p>
        </div>
        <button
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-elevated hover:text-red-400"
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  )
}
