import { cn } from '../lib/utils'

export function StepDots({ activeStep, totalSteps = 3 }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, index) => index + 1).map((step) => (
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
