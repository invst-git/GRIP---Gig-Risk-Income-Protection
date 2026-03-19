import { CheckIcon } from '../icons'
import { cn } from '../../lib/utils'

const toneClasses = {
  active: 'bg-[rgba(47,122,99,0.12)] text-accent-success',
  pending: 'bg-[rgba(36,69,122,0.10)] text-accent-primary',
  triggered: 'bg-[rgba(197,96,102,0.12)] text-accent-danger',
  paid: 'bg-[rgba(47,122,99,0.12)] text-accent-success',
  clear: 'bg-[rgba(47,122,99,0.12)] text-accent-success',
  neutral: 'bg-bg-elevated text-text-secondary',
}

export function StatusBadge({
  status = 'neutral',
  label,
  tone,
  className,
  showCheck,
}) {
  const resolvedTone = tone ?? status
  const resolvedLabel = label ?? status
  const shouldShowCheck = showCheck ?? resolvedTone === 'paid'

  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border border-white/60 px-3 text-[12px] font-medium capitalize shadow-[0_8px_18px_rgba(23,32,51,0.05)]',
        toneClasses[resolvedTone] ?? toneClasses.neutral,
        className,
      )}
    >
      {shouldShowCheck ? <CheckIcon className="h-3.5 w-3.5" /> : null}
      {resolvedLabel}
    </span>
  )
}
