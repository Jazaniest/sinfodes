import { ButuhAksesKabupaten } from '../ButuhAksesKabupaten'
import { PenggunaKabupaten } from './PenggunaKabupaten'

/** Hanya Admin Kabupaten yang mengelola pengguna (SPEC-V0.2 §8.1). */
export function HalamanPenggunaKabupaten() {
  return (
    <ButuhAksesKabupaten kemampuan="kab.pengguna">
      <PenggunaKabupaten />
    </ButuhAksesKabupaten>
  )
}
