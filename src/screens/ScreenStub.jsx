import { Card } from '../components/ui'
import { PageTransition } from '../components/PageTransition'

export function ScreenStub({ eyebrow, title, routePath }) {
  return (
    <PageTransition className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-[390px]">
        <Card animateOnMount className="space-y-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent-primary">
            {eyebrow}
          </p>
          <h1 className="font-display text-[32px] font-normal text-text-primary">
            {title}
          </h1>
          <p className="text-sm text-text-secondary">{routePath}</p>
        </Card>
      </div>
    </PageTransition>
  )
}
