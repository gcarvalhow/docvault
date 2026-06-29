type BannerTone = 'info' | 'error' | 'success'

const TONE_CLASSES: Record<BannerTone, string> = {
  info: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  error: 'bg-red-950/60 text-red-300 border-red-800/60',
  success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: BannerTone
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>{children}</div>
  )
}
