import { cn } from '../lib/utils'

export function StepDots({ activeStep }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            step <= activeStep ? 'bg-accent-primary' : 'bg-border-default',
          )}
        />
      ))}
    </div>
  )
}
