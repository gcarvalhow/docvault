'use client'

import { useTheme } from '@/lib/theme/context'

function IconSun() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-elevated hover:text-slate-200"
    >
      {isLight ? <IconMoon /> : <IconSun />}
      {isLight ? 'Modo escuro' : 'Modo claro'}
    </button>
  )
}
