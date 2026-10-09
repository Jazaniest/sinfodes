/** Lambang tiruan netral untuk kop demo, bukan lambang daerah asli (SPEC §7.5). Desa mengunggah lambangnya di Pengaturan. */
export function LambangTiruan({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 72" fill="none" stroke="currentColor" strokeLinejoin="round" className={className}>
      <path d="M32 3 L59 12 V34 C59 52 47 63 32 69 C17 63 5 52 5 34 V12 Z" strokeWidth="2" />
      <path d="M32 9 L53 16 V34 C53 49 43 58 32 63 C21 58 11 49 11 34 V16 Z" strokeWidth="1" />
      <path
        d="M32 21 L34.35 27.76 L41.51 27.91 L35.8 32.24 L37.88 39.09 L32 35 L26.12 39.09 L28.2 32.24 L22.49 27.91 L29.65 27.76 Z"
        strokeWidth="1.5"
      />
      <path d="M15 48 q4.25 -3 8.5 0 t8.5 0 t8.5 0 t8.5 0" strokeWidth="1.5" />
      <path d="M17 54 q3.75 -2.6 7.5 0 t7.5 0 t7.5 0 t7.5 0" strokeWidth="1.5" />
    </svg>
  )
}
