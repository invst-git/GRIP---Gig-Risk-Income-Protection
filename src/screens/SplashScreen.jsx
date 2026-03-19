import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogoMark } from '../components/LogoMark'
import { PageTransition } from '../components/PageTransition'
import { PrimaryButton, SecondaryButton } from '../components/ui'

const MotionBlock = motion.div

export function SplashScreen() {
  const navigate = useNavigate()

  return (
    <PageTransition className="relative flex min-h-full flex-col overflow-x-hidden overflow-y-auto px-4 py-[clamp(24px,6vh,40px)] sm:px-5">
      <div className="pointer-events-none absolute inset-x-0 top-10 z-0 mx-auto h-[clamp(220px,58vw,288px)] w-[clamp(220px,58vw,288px)] rounded-full grip-soft-orb" />

      <div className="flex flex-1 flex-col justify-center gap-[clamp(28px,7vh,48px)]">
        <MotionBlock
          className="relative z-10 mx-auto max-w-[320px] space-y-4 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
        >
          <p className="mx-auto inline-flex rounded-full border border-white/70 bg-bg-surface/80 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-accent-primary shadow-card backdrop-blur-md">
            Premium Protection
          </p>
          <h1 className="font-display text-[clamp(44px,14vw,52px)] font-normal leading-none text-text-primary">
            GRIP
          </h1>
          <p className="text-[13px] text-text-secondary">
            Gig Risk Income Protection
          </p>
        </MotionBlock>

        <MotionBlock
          className="relative z-10 flex justify-center"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { duration: 0.5, ease: 'easeOut', delay: 0.12 },
          }}
        >
          <div className="rounded-full border border-white/80 bg-bg-surface/92 p-[clamp(22px,6vw,32px)] shadow-[0_26px_60px_rgba(36,69,122,0.12)] backdrop-blur-md">
            <LogoMark />
          </div>
        </MotionBlock>
      </div>

      <MotionBlock
        className="relative z-10 space-y-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            ease: 'easeOut',
            delay: 0.2,
            staggerChildren: 0.12,
          },
        }}
      >
        <div className="mx-auto w-full max-w-[360px] space-y-3 rounded-[28px] border border-white/70 bg-bg-surface/70 p-4 shadow-card backdrop-blur-md">
          <PrimaryButton onClick={() => navigate('/onboarding/1')}>
            I am a Delivery Partner
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate('/admin/dashboard')}>
            Admin Login
          </SecondaryButton>
        </div>
        <p className="px-2 text-center text-[12px] text-text-secondary">
          Parametric income protection for India&apos;s gig workers
        </p>
      </MotionBlock>
    </PageTransition>
  )
}
