/**
 * Pindahkan fokus ke isian bergalat pertama setelah galat tampil (SPEC §4.6). Dipakai formulir panjang yang memakai
 * komponen React Aria, karena react-hook-form tidak memegang ref elemen isiannya.
 */
export function fokusIsianSalah(akar: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const salah = akar?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')
    if (!salah) return
    const sasaran = salah.matches('input, textarea, button, [role="spinbutton"]')
      ? salah
      : salah.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button, [role="spinbutton"]')
    sasaran?.focus()
    sasaran?.scrollIntoView({ block: 'center' })
  })
}
