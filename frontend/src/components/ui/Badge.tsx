type BadgeColor = 'yellow' | 'blue' | 'green' | 'red' | 'gray'

const COLOR_CLASSES: Record<BadgeColor, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-slate-100 text-slate-700',
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
