// Wollknäuel mit Stricknadeln, in der Tint-Farbe des iOS-Looks.
function YarnIcon({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="M24 24 54 5" stroke="var(--tint)" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 24 10 5" stroke="var(--tint)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="39" r="19" fill="var(--fill-gray)" stroke="var(--tint)" strokeWidth="4" />
      <path d="M16 30q16 11 32 0" stroke="var(--tint)" strokeWidth="3" />
      <path d="M15 44q17-10 34 0" stroke="var(--tint)" strokeWidth="3" />
      <path d="M22 54q10-8 22-2" stroke="var(--tint)" strokeWidth="3" />
      <path d="M47 51q9 2 13 9" stroke="var(--tint)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default YarnIcon
