import { bolehDi, type Kemampuan } from '@/domain/pengguna/hak-akses'
import { useSesiAdmin } from './sesi-konteks'

/**
 * Pemeriksa kemampuan untuk layar panel desa. Satu-satunya cara layar memeriksa hak akses: memperhitungkan penangguhan desa
 * (kemampuan tulis dicabut dari semua peran selama Ditangguhkan, SPEC-V0.2 §10.5) dan modul desa (Kesehatan mati mencabut
 * `kesehatan.lihat`, SPEC-V0.2 §12.3), jadi tombol dan menu hilang tanpa layar tahu soal keduanya. Pemeriksaan langsung lewat fungsi `boleh` di `src/features` dilarang (dijaga `useBoleh.test.tsx`).
 */
export function useBoleh(): (kemampuan: Kemampuan) => boolean {
  const { pengguna, desa, modul } = useSesiAdmin()
  return (kemampuan) => bolehDi(pengguna.peran, desa.status, kemampuan, modul)
}
