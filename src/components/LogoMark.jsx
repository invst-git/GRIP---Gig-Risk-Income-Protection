export function LogoMark({ className = 'h-[148px] w-[148px]' }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M50 112V63C50 56.3726 55.3726 51 62 51C68.6274 51 74 56.3726 74 63V87"
        stroke="var(--accent-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74 87V46C74 39.3726 79.3726 34 86 34C92.6274 34 98 39.3726 98 46V87"
        stroke="var(--accent-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M98 80V56C98 49.3726 103.373 44 110 44C116.627 44 122 49.3726 122 56V97"
        stroke="var(--accent-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M43 83C43 78.0294 47.0294 74 52 74C56.9706 74 61 78.0294 61 83V108C61 121.255 71.7452 132 85 132H94C110.569 132 124 118.569 124 102V92"
        stroke="var(--accent-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
