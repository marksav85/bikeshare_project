import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel min-w-0 rounded-xl border p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={17} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-ink sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
