import { motion } from 'framer-motion'
import { pressAnimation } from '../../lib/animations'
import { cn } from '../../lib/utils'
import { SpinnerIcon } from '../icons'

const MotionButton = motion.button
const MotionSpan = motion.span

function ButtonBase({
  children,
  className,
  disabled = false,
  loading = false,
  loadingText,
  icon,
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const isPrimary = variant === 'primary'
  const isDestructive = variant === 'destructive'

  return (
    <MotionButton
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-button px-5 text-sm font-semibold transition-all',
        'disabled:pointer-events-none disabled:opacity-60',
        isPrimary &&
          'bg-accent-primary text-text-on-accent shadow-[0_16px_36px_rgba(36,69,122,0.18)]',
        variant === 'secondary' &&
          'border-[1.5px] border-accent-primary bg-bg-surface text-accent-primary shadow-card',
        isDestructive &&
          'border-[1.5px] border-accent-danger bg-bg-surface text-accent-danger shadow-card',
        className,
      )}
      whileTap={pressAnimation.whileTap}
      transition={pressAnimation.transition}
      {...props}
    >
      {loading ? (
        <>
          <MotionSpan
            className={cn('inline-flex', isPrimary ? 'text-text-on-accent' : 'text-current')}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
          >
            <SpinnerIcon className="h-4 w-4" />
          </MotionSpan>
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </MotionButton>
  )
}

export function PrimaryButton(props) {
  return <ButtonBase variant="primary" {...props} />
}

export function SecondaryButton(props) {
  return <ButtonBase variant="secondary" {...props} />
}

export function DestructiveButton(props) {
  return <ButtonBase variant="destructive" {...props} />
}
