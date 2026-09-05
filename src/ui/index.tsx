import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-accent-fg hover:opacity-90',
        variant === 'secondary' && 'border border-border-strong bg-surface text-text hover:bg-surface-raised',
        variant === 'ghost' && 'text-muted hover:bg-surface-raised hover:text-text',
        className,
      )}
    />
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent',
        className,
      )}
    />
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        'w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text outline-none focus:border-accent',
        className,
      )}
    />
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-lg border border-border bg-surface p-5', className)}>{children}</section>
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-danger">{error}</p> : null
}
