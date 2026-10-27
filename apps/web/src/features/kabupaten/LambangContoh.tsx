/** "Kuantan Singingi" → "KS"; "Pelalawan" → "PE". */
const inisial = (nama: string): string => {
  const kata = nama.trim().split(/\s+/)
  return (kata.length > 1 ? `${kata[0]?.[0] ?? ''}${kata[1]?.[0] ?? ''}` : nama.slice(0, 2)).toUpperCase()
}

/**
 * Lambang contoh kabupaten (SPEC-V0.2 §8.2): perisai garis tipis dengan inisial, sengaja netral supaya tidak dikira lambang
 * kabupaten sungguhan.
 */
export function LambangContoh({ nama, className }: { nama: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 46" role="img" aria-label="Lambang contoh" className={className}>
      <path d="M20 2 L37 8 V22 C37 33 29.5 40.5 20 44 C10.5 40.5 3 33 3 22 V8 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 6.5 L33 11 V22 C33 30.5 27.5 36.5 20 39.5 C12.5 36.5 7 30.5 7 22 V11 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <text x="20" y="27" textAnchor="middle" fontSize="11" fontFamily="var(--font-serif)" fontWeight="600" fill="currentColor">
        {inisial(nama)}
      </text>
    </svg>
  )
}
