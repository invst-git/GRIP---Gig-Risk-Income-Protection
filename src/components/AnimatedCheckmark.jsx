export function AnimatedCheckmark({ className = 'h-24 w-24' }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="48"
        cy="48"
        r="34"
        strokeWidth="4"
        className="grip-checkmark-circle"
      />
      <path
        d="M32 49.5L43 60L65 38"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="grip-checkmark-path"
      />
    </svg>
  )
}
