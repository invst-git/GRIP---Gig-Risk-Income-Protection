export const pageTransition = {
  duration: 0.3,
  ease: 'easeOut',
}

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: pageTransition,
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: pageTransition,
  },
}

export const cardContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export const cardItemVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

export const pressAnimation = {
  whileTap: {
    scale: 0.97,
  },
  transition: {
    duration: 0.1,
    ease: 'easeOut',
  },
}

export const progressAnimation = {
  duration: 0.6,
  ease: 'easeOut',
}

export const pulseAnimation = {
  scale: [1, 1.4, 1],
  opacity: [1, 0.4, 1],
  transition: {
    duration: 2,
    ease: 'easeInOut',
    repeat: Infinity,
  },
}
