import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { ChevronLeftIcon } from './icons'

export function ScreenHeader({
  title,
  backTo,
  align = 'left',
  rightSlot = null,
  className,
  titleClassName,
}) {
  const navigate = useNavigate()

  const backButton = backTo ? (
    <button
      type="button"
      onClick={() => navigate(backTo)}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-bg-surface/90 text-text-primary shadow-card backdrop-blur-sm"
      aria-label="Go back"
    >
      <ChevronLeftIcon className="h-5 w-5" />
    </button>
  ) : (
    <div className="h-10 w-10" />
  )

  if (align === 'center') {
    return (
      <div className={cn('grid grid-cols-[40px_1fr_40px] items-center px-5 pt-5', className)}>
        {backButton}
        <h2
          className={cn(
            'text-center text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary',
            titleClassName,
          )}
        >
          {title}
        </h2>
        <div className="flex h-10 items-center justify-end">{rightSlot}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 px-5 pt-5', className)}>
      {backButton}
      <h1
        className={cn(
          'text-[18px] font-semibold text-text-primary',
          titleClassName,
        )}
      >
        {title}
      </h1>
      <div className="ml-auto">{rightSlot}</div>
    </div>
  )
}
