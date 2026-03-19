export function LogoMark({
  className = 'h-[clamp(112px,34vw,148px)] w-[clamp(112px,34vw,148px)]',
}) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M80 22C57.9086 22 42 38.3452 42 60.1342V86.4463C42 107.87 56.1948 126.265 80 134C103.805 126.265 118 107.87 118 86.4463V60.1342C118 38.3452 102.091 22 80 22Z"
        stroke="var(--accent-primary)"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <rect
        x="54"
        y="76"
        width="12"
        height="26"
        rx="6"
        fill="var(--accent-primary)"
      />
      <rect
        x="74"
        y="64"
        width="12"
        height="38"
        rx="6"
        fill="var(--accent-primary)"
      />
      <rect
        x="94"
        y="52"
        width="12"
        height="50"
        rx="6"
        fill="var(--accent-primary)"
      />
      <path
        d="M56 102C56 111.389 63.6112 119 73 119H87.5C96.6127 119 104 111.613 104 102.5V96H89"
        stroke="var(--accent-secondary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
