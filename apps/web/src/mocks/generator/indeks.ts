import { geserBulan } from '@/domain/indeks/periode'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { akhirBulan } from '@/domain/kabupaten/laporan'
import type { Langganan } from '@/domain/konsol/schema'
import type { Desa } from '@/domain/wilayah/schema'
import { realisasiSampai } from '../kabupaten-angka'
import { BARIS_KOSONG, aktifSepanjang, jumlahSenin } from '../indeks-dasar'
import type { Acak } from '../prng'
import type { RekamDesa, UkuranBulanIndeks } from '../tipe-db'

const satuDesimal = (n: number) => Math.round(n * 10) / 10
const batas = (x: number, min: number, maks: number) => Math.min(maks, Math.max(min, x))

/** Bulan "YYYY-MM" dari `awal` sampai `akhir`, terlama dulu. */
function rentangBulan(awal: string, akhir: string): string[] {
  const hasil: string[] = []
  for (let b = awal; b <= akhir; b = geserBulan(b, 1)) hasil.push(b)
  return hasil
}

type MutuDesa = {
  digital: number
  data: number
  transparan: number
  responsif: number
  website: number
  /** Perubahan mutu per bulan: desa yang membaik atau memburuk pelan-pelan. */
  tren: number
  /** Cepat atau lambatnya serapan belanja tahun itu, 0,5-1,05 dari target berjalan. */
  laju: number
}

/** Mutu dasar per kategori: terpusat pada satu mutu desa, supaya tingkatan Indeks tersebar dari Rintisan sampai Mandiri. */
function mutuDesa(acak: Acak): MutuDesa {
  const [dari, sampai] = acak.berbobot<readonly [number, number]>([
    [[0.02, 0.2], 0.16],
    [[0.2, 0.45], 0.3],
    [[0.45, 0.75], 0.34],
    [[0.75, 0.98], 0.2],
  ])
  const pusat = dari + acak.angka() * (sampai - dari)
  const sekitar = () => batas(pusat + (acak.angka() - 0.5) * 0.26, 0.03, 0.99)
  return {
    digital: sekitar(),
    data: sekitar(),
    transparan: sekitar(),
    responsif: sekitar(),
    website: sekitar(),
    tren: (acak.angka() - 0.4) * 0.004,
    laju: 0.5 + pusat * 0.55,
  }
}

/** Belanja kumulatif per bulan (Januari-Desember) untuk tahun yang sudah lewat, tidak pernah menurun dan paling tinggi pagu. */
function realisasiTahunLalu(acak: Acak, pagu: number, laju: number): number[] {
  let sebelumnya = 0
  return Array.from({ length: 12 }, (_, i) => {
    const kumulatif = Math.min(pagu, Math.round(pagu * ((i + 1) / 12) * laju * (0.92 + acak.angka() * 0.16)))
    sebelumnya = Math.max(sebelumnya, kumulatif)
    return sebelumnya
  })
}

/**
 * Riwayat jejak bulanan desa rekaman (SPEC-V0.2 §9.7): satu baris per desa per bulan dari Januari (tahun acuan - 2) sampai
 * bulan acuan. Menu Dana Desa dan Serapan memakai angka yang sama (tahun berjalan dari `belanjaBulanan`), dan surat 12 bulan
 * terakhir sama dengan `suratPerBulan`. Sebelum desa memakai Sinfodes dan sesudah masa langganannya tidak ada kejadian.
 */
export function bangkitkanUkuranRekam(
  acak: Acak,
  o: { acuan: Date; desa: readonly Desa[]; rekam: readonly RekamDesa[]; langganan: readonly Langganan[] },
): UkuranBulanIndeks[] {
  const hariIni = tanggalIsoWib(o.acuan)
  const bulanAcuan = hariIni.slice(0, 7)
  const tahunAcuan = Number(hariIni.slice(0, 4))
  const bulanBulan = rentangBulan(`${tahunAcuan - 2}-01`, bulanAcuan)
  const hasil: UkuranBulanIndeks[] = []

  for (const rekam of o.rekam) {
    const desa = o.desa.find((d) => d.id === rekam.desaId)
    if (!desa) continue
    const langganan = o.langganan.find((l) => l.desaId === desa.id)
    const mutu = mutuDesa(acak)

    // Bulan pertama desa benar-benar memakai Sinfodes: dari rekaman surat 12 bulan terakhir, lalu ke belakang selama berlangganan.
    const bulanSurat = new Map(rekam.suratPerBulan.map((s) => [s.bulan, s.jumlah]))
    const pertamaAdaSurat = rekam.suratPerBulan.find((s) => s.jumlah > 0)?.bulan ?? null
    const rataSurat = Math.max(1, Math.round(rekam.suratPerBulan.reduce((n, s) => n + s.jumlah, 0) / Math.max(1, rekam.suratPerBulan.filter((s) => s.jumlah > 0).length)))
    const pakaiSejak = pertamaAdaSurat === (rekam.suratPerBulan[0]?.bulan ?? null) ? '0000-00' : pertamaAdaSurat

    // APBDes per tahun: tahun acuan dari rekaman, tahun lalu acak. Pagu 0 berarti desa tidak punya APBDes tahun itu.
    const apbdesTahun = new Map<number, { pagu: number; realisasi: number[] } | null>()
    for (let tahun = tahunAcuan - 2; tahun <= tahunAcuan; tahun++) {
      const sebelumnyaAda = acak.peluang(tahun === tahunAcuan - 1 ? 0.92 : 0.8)
      const pagu = Math.round((rekam.apbdes?.anggaran ?? acak.bulat(900, 2600) * 1_000_000) * (0.82 + acak.angka() * 0.16))
      const lalu = realisasiTahunLalu(acak, pagu, mutu.laju)
      if (tahun === tahunAcuan) {
        apbdesTahun.set(tahun, rekam.apbdes && rekam.belanjaBulanan ? { pagu: rekam.apbdes.anggaran, realisasi: [] } : null)
      } else apbdesTahun.set(tahun, sebelumnyaAda && pakaiSejak !== null ? { pagu, realisasi: lalu } : null)
    }

    // Satu penarikan mutu per bulan; bulan acuan paling mendekati mutu dasar.
    const indeksAcuan = bulanBulan.length - 1
    for (const [indeks, bulan] of bulanBulan.entries()) {
      const awal = `${bulan}-01`
      const akhir = bulan === bulanAcuan ? hariIni : akhirBulan(bulan)
      const aktif = aktifSepanjang(desa, langganan, awal, akhir)
      const mundur = indeksAcuan - indeks
      const pecahan = bulan === bulanAcuan ? Number(hariIni.slice(8, 10)) / 30 : 1
      const sama = (m: number) => batas(m + mutu.tren * -mundur + (acak.angka() - 0.5) * 0.12, 0.02, 0.99)
      const adaPakai = aktif && pakaiSejak !== null && bulan >= pakaiSejak && bulan >= (langganan?.mulai?.slice(0, 7) ?? '9999-99')
      const dasar = { desaId: desa.id, bulan }
      if (!adaPakai) {
        hasil.push({ ...dasar, aktif, ...structuredClone(BARIS_KOSONG) })
        continue
      }

      const qResponsif = sama(mutu.responsif)
      const qData = sama(mutu.data)
      const qTransparan = sama(mutu.transparan)
      const qDigital = sama(mutu.digital)
      const qWebsite = sama(mutu.website)
      const tahun = Number(bulan.slice(0, 4))

      // Layanan: surat Selesai sama dengan rekaman untuk 12 bulan terakhir; bulan lebih lama dari sekitar rata-rata.
      const selesai = bulanSurat.has(bulan) ? bulanSurat.get(bulan)! : Math.max(0, Math.round(rataSurat * (0.7 + acak.angka() * 0.45)))
      const jamDasar = rekam.waktuLayananJam ?? 36
      const medianJam = selesai > 0 ? satuDesimal(batas(jamDasar * (0.85 + (1 - qData) * 0.4 + acak.angka() * 0.2), 1, 160)) : null

      const pengaduan = acak.peluang(0.06) ? acak.bulat(0, 2) : Math.max(3, Math.round((3 + acak.angka() * 9) * (0.5 + qResponsif) * pecahan))
      const dibalas = Math.round(pengaduan * (0.2 + 0.8 * qResponsif))
      const dibalas72 = Math.round(dibalas * (0.2 + 0.8 * qResponsif))
      const jamTanggap = (rekam.waktuTanggapanJam ?? 12) * (0.6 + (1 - qResponsif) * 1.2)

      const diimpor = rekam.jiwa > 0
      const mutasi = Math.round((rekam.jiwa / 1100) * (0.4 + acak.angka()) * pecahan)
      const kelengkapan = rekam.kelengkapan === null ? null : mundur === 0 ? rekam.kelengkapan : Math.max(0.4, rekam.kelengkapan - mundur * 0.003 - acak.angka() * 0.01)

      const apbdes = apbdesTahun.get(tahun) ?? null
      const bulanKe = Number(bulan.slice(5, 7))
      const serapan = apbdes
        ? {
            pagu: apbdes.pagu,
            realisasi: tahun === tahunAcuan ? realisasiSampai(rekam.belanjaBulanan ?? [], bulan) : apbdes.realisasi[bulanKe - 1],
          }
        : null
      const tayang = desa.status === 'Aktif' || desa.status === 'Ditangguhkan'
      const kegiatanBerjalan = acak.peluang(0.1) ? 0 : acak.bulat(2, 6)

      const masuk = Math.round(selesai * (1.05 + acak.angka() * 0.15))
      const minggu = jumlahSenin(bulan, hariIni)
      let mingguAktif = 0
      for (let i = 0; i < minggu; i++) if (acak.peluang(qWebsite)) mingguAktif++

      hasil.push({
        ...dasar,
        aktif,
        layanan: { selesai, medianJam },
        responsif: { pengaduan, dibalas, dibalas72, medianBalasJam: dibalas > 0 ? satuDesimal(batas(jamTanggap * (0.7 + acak.angka() * 0.6), 1, 200)) : null },
        data: { diimpor, kelengkapan, mutasi, mutasiTepat: Math.round(mutasi * (0.4 + 0.6 * qData)) },
        transparan: {
          punyaApbdes: serapan !== null,
          apbdesTerbit: serapan !== null && tayang && acak.peluang(0.05 + 0.95 * qTransparan),
          realisasiBaru: serapan !== null && acak.peluang(0.05 + 0.95 * qTransparan),
          kegiatanBerjalan,
          kegiatanBerkabar: Math.round(kegiatanBerjalan * qTransparan),
        },
        digital: { masuk, mandiri: Math.round(masuk * qDigital * 0.55) },
        website: { tayang, minggu, mingguAktif },
        serapan,
      })
    }
  }
  return hasil
}
