import { useNotifications } from '../../context/NotificationContext'

export default function NotificationToast() {
  const { toast } = useNotifications()
  const isWarning = toast?.type === 'warning'

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50
                  max-w-[340px] w-[90%] rounded-xl px-4 py-3
                  flex items-start gap-3 shadow-lg
                  transition-all duration-300 pointer-events-none
                  ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                  ${isWarning
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-green-50 border border-green-200'}`}
    >
      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0
                       ${isWarning ? 'bg-amber-500' : 'bg-green-500'}`} />
      <div className="flex flex-col gap-0.5">
        <p className={`text-sm font-medium
                       ${isWarning ? 'text-amber-800' : 'text-green-800'}`}>
          {isWarning ? 'Claim Under Review' : 'Payout Approved'}
        </p>
        <p className={`text-xs
                       ${isWarning ? 'text-amber-600' : 'text-green-600'}`}>
          {toast?.message}
        </p>
      </div>
    </div>
  )
}
