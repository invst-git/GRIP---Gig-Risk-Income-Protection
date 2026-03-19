import { motion } from 'framer-motion'
import { cardContainerVariants } from '../lib/animations'
import { cn } from '../lib/utils'

const MotionGroup = motion.div

export function StaggerGroup({ children, className }) {
  return (
    <MotionGroup
      className={cn(className)}
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </MotionGroup>
  )
}
