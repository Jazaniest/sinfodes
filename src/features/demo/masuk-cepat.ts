import { masukKabupaten } from '@/api/kabupaten'
import { masukKonsol } from '@/api/konsol'
import { masuk } from '@/api/sesi'
import { masukWarga } from '@/api/warga'
import { keAlamat } from '@/app/alamat'
import { simpanSesi } from '@/app/sesi'
import type { KonteksAlamat, TujuanAlamat } from '@/domain/alamat/alamat'
import { muatKendali } from './useKendaliDemo'

/**
 * Masuk cepat demo lintas alamat (SPEC-V0.2 §4.6). Sesi terpisah per alamat, jadi tombol di halaman demo membuka alamat
 * tujuan dengan `?demo=<kunci akun>`; halaman tujuan yang masuk lalu menghapus parameter itu. Kuncinya ID akun, bukan NIK
 * atau kata sandi. Hanya dipakai di build demo.
 */
export function tautanMasukCepat(tujuan: TujuanAlamat, jalur: string, kunci: string): string {
  return keAlamat(tujuan, `${jalur}${jalur.includes('?') ? '&' : '?'}demo=${encodeURIComponent(kunci)}`)
}

/** Pisahkan kunci masuk cepat dari query; `sisa` adalah query tanpa `demo`. */
export function ambilKunciMasukCepat(search: string): { kunci: string | null; sisa: string } {
  const parameter = new URLSearchParams(search)
  const kunci = parameter.get('demo')
  parameter.delete('demo')
  const sisa = parameter.toString()
  return { kunci, sisa: sisa ? `?${sisa}` : '' }
}

/** Masuk dengan akun demo bila akunnya cocok dengan alamat dan jalur ini; false bila tidak cocok atau gagal. */
export async function terapkanMasukCepat(konteks: KonteksAlamat, pathname: string, kunci: string): Promise<boolean> {
  const kendali = await muatKendali()
  const akun = kendali.cariAkunDemo(kunci)
  if (!akun) return false
  try {
    if (konteks.jenis === 'konsol') {
      if (akun.bagian !== 'konsol') return false
      simpanSesi((await masukKonsol(akun.email, kendali.KATA_SANDI_DEMO)).token, 'konsol')
      return true
    }
    if (konteks.jenis === 'kabupaten') {
      if (akun.bagian !== 'kabupaten' || akun.labelKabupaten !== konteks.label) return false
      simpanSesi((await masukKabupaten(akun.email, kendali.KATA_SANDI_DEMO)).token, 'kabupaten')
      return true
    }
    if (konteks.jenis !== 'desa' || akun.bagian === 'konsol' || akun.bagian === 'kabupaten' || akun.labelDesa !== konteks.label) return false
    const keWarga = pathname === '/warga' || pathname.startsWith('/warga/')
    if (keWarga && akun.bagian === 'warga') {
      simpanSesi((await masukWarga(akun.nik, akun.pin)).token, 'warga')
      return true
    }
    if (!keWarga && akun.bagian === 'admin') {
      simpanSesi((await masuk(akun.email, kendali.KATA_SANDI_DEMO)).token)
      return true
    }
    return false
  } catch {
    return false
  }
}
