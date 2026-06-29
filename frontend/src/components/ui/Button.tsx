import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  isLoading?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-muted focus-visible:outline-brand',
  secondary:
    'bg-transparent text-slate-200 border border-rim hover:bg-elevated focus-visible:outline-rim',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  ghost:
    'bg-transparent text-slate-400 hover:bg-elevated hover:text-slate-200 focus-visible:outline-rim',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading = false, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {isLoading ? 'Aguarde…' : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
