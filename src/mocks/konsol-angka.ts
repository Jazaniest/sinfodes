import { daftarBulanTerakhir, tanggalIsoWib } from '@/domain/format/tanggal'
import { daftarMingguTerakhir } from '@/domain/konsol/aturan'
import { dataBelumLengkap } from '@/domain/penduduk/filter'
import { persiapanBerurutan, type Persiapan } from '@/domain/wilayah/persiapan'
import type { Desa } from '@/domain/wilayah/schema'
import { persiapanDesa } from './persiapan'
import type { DbDemo, RekamDesa } from './tipe-db'

const HARI_MS = 86_400_000

export type AngkaKonsol = Omit<RekamDesa, 'desaId' | 'langkahSelesai'> & { persiapan: Persiapan }

const tambahTujuhHari = (senin: string) => new Date(Date.parse(`${senin}T00:00:00Z`) + 7 * HARI_MS).toISOString().slice(0, 10)

/**
 * Angka Konsol satu desa (SPEC §11). Desa dengan data panel (Sungai Sialang, Tanjung Lamo, desa dari Tambah desa)
 * dihitung langsung dari datanya; 38 desa fiktif lain memakai rekamannya.
 */
export function angkaKonsolDesa(db: DbDemo, desa: Desa, sekarang: Date): AngkaKonsol {
  const rekam = db.rekamDesa.find((r) => r.desaId === desa.id)
  if (rekam) {
    const { jiwa, kelengkapan, penggunaAktif, aktivitasTerakhir, suratPerBulan, masukPerMinggu, suratMingguIni, kontak } = rekam
    return {
      jiwa, kelengkapan, penggunaAktif, aktivitasTerakhir, suratPerBulan, masukPerMinggu, suratMingguIni, kontak,
      persiapan: persiapanBerurutan(rekam.langkahSelesai),
    }
  }
  const hidup = db.penduduk.filter((p) => p.desaId === desa.id && p.statusDasar === 'Hidup')
  const lengkap = hidup.filter((p) => !dataBelumLengkap(p, sekarang)).length
  const masuk = db.riwayatMasuk.filter((m) => m.desaId === desa.id)
  const sejak30Hari = sekarang.getTime() - 30 * HARI_MS
  const kejadian = [...db.aktivitas.filter((a) => a.desaId === desa.id).map((a) => a.waktu), ...masuk.map((m) => m.waktu)]
  const terbit = db.permohonan.filter((p) => p.desaId === desa.id).flatMap((p) => (p.terbit ? [p.terbit.pada] : []))
  const penggunaDesa = db.pengguna.filter((p) => p.desaId === desa.id)
  const operator = penggunaDesa.find((p) => p.peran === 'operator')
  return {
    jiwa: hidup.length,
    kelengkapan: hidup.length > 0 ? lengkap / hidup.length : null,
    penggunaAktif: new Set(masuk.filter((m) => Date.parse(m.waktu) >= sejak30Hari).map((m) => m.penggunaId)).size,
    aktivitasTerakhir: kejadian.length > 0 ? kejadian.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b)) : null,
    persiapan: persiapanDesa(db, desa),
    suratPerBulan: daftarBulanTerakhir(sekarang, 12)
      .reverse()
      .map((bulan) => ({ bulan, jumlah: terbit.filter((t) => tanggalIsoWib(new Date(t)).startsWith(bulan)).length })),
    masukPerMinggu: daftarMingguTerakhir(sekarang, 12).map((mulai) => {
      const akhir = tambahTujuhHari(mulai)
      return { mulai, jumlah: masuk.filter((m) => tanggalIsoWib(new Date(m.waktu)) >= mulai && tanggalIsoWib(new Date(m.waktu)) < akhir).length }
    }),
    suratMingguIni: terbit.filter((t) => Date.parse(t) >= sekarang.getTime() - 7 * HARI_MS).length,
    kontak: {
      kades: penggunaDesa.find((p) => p.peran === 'kades' && p.aktif)?.nama ?? null,
      operator: operator ? { nama: operator.nama, email: operator.email } : null,
    },
  }
}
