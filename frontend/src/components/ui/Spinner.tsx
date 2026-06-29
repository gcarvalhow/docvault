export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={`h-5 w-5 animate-spin rounded-full border-2 border-rim border-t-brand ${className}`}
    />
  )
}
