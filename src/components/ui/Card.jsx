import { motion } from 'framer-motion'
import { cardItemVariants } from '../../lib/animations'
import { cn } from '../../lib/utils'

const MotionCard = motion.div

export function Card({
  children,
  className,
  variants = cardItemVariants,
  animateOnMount = false,
  ...props
}) {
  const motionProps = animateOnMount
    ? {
        initial: 'initial',
        animate: 'animate',
      }
    : {}

  return (
    <MotionCard
      className={cn(
        'rounded-card border border-border-default bg-bg-surface/95 p-5 shadow-card backdrop-blur-[2px]',
        className,
      )}
      variants={variants}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionCard>
  )
}
