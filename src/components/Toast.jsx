import { AnimatePresence, motion } from 'framer-motion'

const MotionToast = motion.div

export function Toast({ message, visible }) {
  return (
    <AnimatePresence>
      {visible ? (
        <MotionToast
          className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-40px)] max-w-[390px] -translate-x-1/2 rounded-full border border-white/80 bg-bg-surface/95 px-4 py-3 text-center text-[13px] text-text-primary shadow-card backdrop-blur-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.2, ease: 'easeOut' } }}
        >
          {message}
        </MotionToast>
      ) : null}
    </AnimatePresence>
  )
}
