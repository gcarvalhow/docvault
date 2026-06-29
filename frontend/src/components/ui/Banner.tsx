type BannerTone = 'info' | 'error' | 'success'

const TONE_CLASSES: Record<BannerTone, string> = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  success: 'bg-green-50 text-green-800 border-green-200',
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
