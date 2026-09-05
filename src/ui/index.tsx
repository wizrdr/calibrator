import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg' | 'sm'
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' && 'min-h-11 px-4 py-2 text-[15px]',
        size === 'lg' && 'min-h-12 px-5 py-3 text-base',
        size === 'sm' && 'min-h-9 px-3 py-1.5 text-sm',
        variant === 'primary' && 'bg-accent text-accent-fg hover:bg-accent-strong',
        variant === 'secondary' && 'bg-surface-raised text-text hover:bg-border',
        variant === 'ghost' && 'text-muted hover:bg-surface-raised hover:text-text',
        variant === 'danger' && 'bg-danger-soft text-danger hover:bg-border',
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
        'min-h-11 w-full rounded-md border border-border bg-surface px-3.5 py-2 text-[15px] text-text placeholder:text-faint focus:border-accent focus:outline-none',
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
        'w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-faint focus:border-accent focus:outline-none',
        className,
      )}
    />
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  )
}

export function Card({ children, className, tone = 'default' }: { children: ReactNode; className?: string; tone?: 'default' | 'active' | 'soft' }) {
  return (
    <section
      className={cn(
        'rounded-lg p-5',
        tone === 'default' && 'bg-surface',
        tone === 'active' && 'border-[1.5px] border-accent bg-surface',
        tone === 'soft' && 'bg-accent-soft text-accent-strong',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function Pill({ children, tone = 'done', className }: { children: ReactNode; tone?: 'done' | 'pending' | 'neutral'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium',
        tone === 'done' && 'bg-accent-soft text-accent-strong',
        tone === 'pending' && 'border border-dashed border-border-strong text-muted',
        tone === 'neutral' && 'bg-surface-raised text-text',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong p-6">
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-[60ch] text-[15px] text-muted">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-danger">{error}</p> : null
}

export function Stat({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-2xl font-semibold tabular-nums leading-tight" data-testid={testId}>
        {value}
      </span>
      {sub && <span className="text-[13px] text-muted">{sub}</span>}
    </div>
  )
}

export function Icon({ d, size = 18, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export const icons = {
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chart: 'M4 19V5M4 15l5-4 5 3 6-6',
  upload: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  check: 'M20 6 9 17l-5-5',
  back: 'M19 12H5M12 19l-7-7 7-7',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
}
