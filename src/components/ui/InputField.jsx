import { cn } from '../../lib/utils'

function SelectChevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InputField({
  label,
  note,
  error,
  as = 'input',
  options = [],
  className,
  containerClassName,
  ...props
}) {
  const isSelect = as === 'select'
  const sharedClasses = cn(
    'h-[52px] w-full rounded-input border-[1.5px] bg-bg-surface px-4 text-[14px] text-text-primary outline-none shadow-[0_8px_20px_rgba(23,32,51,0.04)] transition-all',
    'border-border-default placeholder:text-text-disabled focus:border-border-active focus:shadow-[0_0_0_4px_rgba(36,69,122,0.09)]',
    error && 'border-accent-danger',
    isSelect && 'appearance-none pr-10',
    className,
  )

  return (
    <label className={cn('block space-y-2', containerClassName)}>
      {label ? (
        <span className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
            {label}
          </span>
          {note ? (
            <span className="text-[12px] text-text-secondary">{note}</span>
          ) : null}
        </span>
      ) : null}
      <span className="relative block">
        {isSelect ? (
          <select className={sharedClasses} {...props}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input className={sharedClasses} {...props} />
        )}
        {isSelect ? <SelectChevron /> : null}
      </span>
      {error ? (
        <span className="block text-[12px] text-accent-danger">{error}</span>
      ) : null}
    </label>
  )
}
