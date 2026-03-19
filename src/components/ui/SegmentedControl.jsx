import { motion } from 'framer-motion'
import { pressAnimation } from '../../lib/animations'
import { cn } from '../../lib/utils'

const MotionButton = motion.button

export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  className,
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
          {label}
        </p>
      ) : null}
      <div className="grid min-h-[52px] grid-flow-col auto-cols-fr rounded-full border-[1.5px] border-border-default bg-bg-elevated/85 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        {options.map((option) => {
          const selected = option.value === value

          return (
            <MotionButton
              key={option.value}
              type="button"
              className={cn(
                'flex min-h-[44px] items-center justify-center rounded-full px-2 text-center text-[12px] font-semibold leading-[1.1] transition-colors',
                selected
                  ? 'bg-accent-primary text-text-on-accent shadow-[0_10px_22px_rgba(36,69,122,0.16)]'
                  : 'bg-transparent text-text-secondary',
              )}
              onClick={() => onChange(option.value)}
              whileTap={pressAnimation.whileTap}
              transition={pressAnimation.transition}
            >
              {option.label}
            </MotionButton>
          )
        })}
      </div>
    </div>
  )
}
