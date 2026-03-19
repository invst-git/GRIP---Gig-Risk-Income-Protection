import { motion } from 'framer-motion'
import { pageVariants } from '../lib/animations'
import { cn } from '../lib/utils'

const MotionPage = motion.div

export function PageTransition({ children, className }) {
  return (
    <MotionPage
      className={cn('h-full min-h-full w-full overflow-x-hidden bg-bg-primary', className)}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </MotionPage>
  )
}
