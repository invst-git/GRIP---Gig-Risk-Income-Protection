export default function GRIPLogo({ dark = false, size = 'md' }) {
  const scales = { sm: 0.5, md: 0.7, lg: 1 }
  const s = scales[size] || 0.7
  const arcColor = dark
    ? { outer: '#374151', mid: '#4b5fa8', inner: '#ffffff', dot: '#ffffff' }
    : { outer: '#d1d5db', mid: '#4b5fa8', inner: '#1a2e4a', dot: '#1a2e4a' }

  return (
    <svg
      width={72 * s}
      height={40 * s}
      viewBox="0 0 72 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 36 A32 32 0 0 1 68 36"
        stroke={arcColor.outer}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M12 36 A24 24 0 0 1 60 36"
        stroke={arcColor.mid}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 36 A16 16 0 0 1 52 36"
        stroke={arcColor.inner}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="36" cy="36" r="4" fill={arcColor.dot} />
    </svg>
  )
}
