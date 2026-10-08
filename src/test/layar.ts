/** Ubah lebar layar jsdom; `matchMedia` tiruan di setup.ts membacanya. Kembali ke 1024 setelah tiap uji. */
export function aturLebarLayar(lebar: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: lebar })
}
