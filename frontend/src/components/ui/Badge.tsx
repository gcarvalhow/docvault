type BadgeColor = 'yellow' | 'blue' | 'green' | 'red' | 'gray'

const COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
  blue: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  gray: 'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/30',
}

export function Badge({ color, children }: { color: BadgeColor; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_CLASSES[color]}`}
    >
      {children}
    </span>
  )
}
