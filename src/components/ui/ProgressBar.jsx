import { motion } from 'framer-motion'
import { progressAnimation } from '../../lib/animations'
import { cn } from '../../lib/utils'

const MotionFill = motion.div

export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
  heightClassName = 'h-1.5',
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-bg-elevated',
        heightClassName,
        trackClassName,
        className,
      )}
    >
      <MotionFill
        className={cn('h-full rounded-full bg-accent-primary', fillClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={progressAnimation}
      />
    </div>
  )
}
