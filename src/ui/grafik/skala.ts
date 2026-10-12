/** Batas atas sumbu yang rapi (1, 2, 2,5, 5, atau 10 × 10^n), tepat di atas nilai terbesar. */
export function maksRapi(n: number): number {
  if (n <= 0) return 1
  const pangkat = 10 ** Math.floor(Math.log10(n))
  for (const k of [1, 2, 2.5, 5]) if (n <= k * pangkat) return k * pangkat
  return 10 * pangkat
}
