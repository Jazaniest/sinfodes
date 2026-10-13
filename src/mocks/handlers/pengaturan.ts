import { http, HttpResponse } from 'msw'
import { angkaRomawi } from '@/domain/format/romawi'
import { tanggalIsoWib } from '@/domain/format/tanggal'
import { identitasDesaSchema, type PengaturanDesa } from '@/domain/pengaturan/identitas'
import { jabatanBawaan } from '@/domain/pengaturan/pengguna'
import { ubahPenomoranSchema, type Penomoran } from '@/domain/pengaturan/penomoran'
import { nomoriSusunan, susunanSama, ubahWilayahSchema, type UbahWilayah, type WilayahDesa } from '@/domain/pengaturan/wilayah'
import type { Pengguna } from '@/domain/pengguna/schema'
import { urutBerikutnya } from '@/domain/surat/nomor-surat'
import { pengaturanBawaan } from '@/domain/surat/pengaturan'
import { namaDusun } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import { ambilDb, ubahDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import type { DbDemo } from '../tipe-db'
import { bacaJson, balasIsianTidakValid, butuhKemampuan } from '../tulis'
import { namaPejabat, pengaturanDesa } from './surat'

const butuhPengatur = (request: Request) => butuhKemampuan(request, 'pengaturan.kelola', 'Peran Anda tidak berhak membuka Pengaturan desa.')

const desaMilik = (db: DbDemo, p: Pengguna): Desa | undefined => db.desa.find((d) => d.id === p.desaId)
const desaTidakAda = () => balasGalat('SERVER', 'Data desa tidak ditemukan.', 500)

function pengaturanDesaDari(db: DbDemo, desa: Desa): PengaturanDesa {
  const kades = namaPejabat(db, desa.id).kades
  return {
    identitas: {
      nama: desa.nama,
      kodeDesa: desa.kodeDesa,
      alamatKantor: desa.alamatKantor,
      kodePos: desa.kodePos,
      surel: desa.surel,
      telepon: desa.telepon,
      jamLayanan: desa.jamLayanan,
      lambang: desa.lambang ?? null,
    },
    kecamatan: desa.kecamatan.nama,
    kabupaten: desa.kabupaten.nama,
    kepalaDesa: kades === '—' ? null : kades,
  }
}

/** Susunan dusun, RW, dan RT terkunci begitu desa punya penduduk atau KK: setiap data itu terikat ke nomornya. */
const susunanTerkunci = (db: DbDemo, desa: Desa) =>
  db.penduduk.some((p) => p.desaId === desa.id) || db.keluarga.some((k) => k.desaId === desa.id)

const wilayahDari = (db: DbDemo, desa: Desa): WilayahDesa => ({
  istilah: desa.istilahWilayah,
  dusun: db.dusun.filter((d) => d.desaId === desa.id).sort((a, b) => a.nomor - b.nomor),
  susunanTerkunci: susunanTerkunci(db, desa),
})

/** ID dusun baru yang belum pernah dipakai, mis. "dsn_tl_3". ID dusun yang baru dihapus tidak dipakai ulang. */
function idDusunBaru(desa: Desa, terpakai: Set<string>): string {
  const awalan = `dsn_${desa.kodeSurat.toLowerCase()}_`
  let n = 1
  while (terpakai.has(`${awalan}${n}`)) n += 1
  terpakai.add(`${awalan}${n}`)
  return `${awalan}${n}`
}

/**
 * Susunan baru selama desa belum punya penduduk (tahap 6C). Dusun dikenali dari ID-nya; ID yang bukan milik desa ini
 * berarti dusun baru, jadi data desa lain tidak pernah tersentuh. Nomor mengikuti urutan (`nomoriSusunan`). Dusun yang
 * masih dipakai akun Kepala Dusun tidak boleh dihapus; jabatan bawaan akun itu ikut nomor barunya.
 */
function aturSusunan(db: DbDemo, desa: Desa, isian: UbahWilayah): Response | null {
  const lama = db.dusun.filter((d) => d.desaId === desa.id)
  const tetap = new Set(isian.dusun.map((d) => d.id))
  for (const d of lama) {
    const kadus = tetap.has(d.id) ? undefined : db.pengguna.find((p) => p.dusunId === d.id)
    if (kadus) {
      return balasGalat(
        'CONFLICT',
        `${namaDusun(d, desa.istilahWilayah)} masih dipakai akun ${kadus.nama}. Ganti peran akun itu dulu di Pengaturan › Pengguna.`,
        409,
      )
    }
  }
  const terpakai = new Set(db.dusun.map((d) => d.id))
  const baru: Dusun[] = nomoriSusunan(isian.dusun).map((d, i) => {
    const asal = lama.find((x) => x.id === d.id)
    return {
      id: asal?.id ?? idDusunBaru(desa, terpakai), desaId: desa.id, nomor: i + 1, nama: d.nama, kepalaDusun: d.kepalaDusun,
      posyandu: asal?.posyandu ?? '', rw: d.rw,
    }
  })
  ubahDb((x) => {
    desa.istilahWilayah = isian.istilah
    x.dusun = [...x.dusun.filter((d) => d.desaId !== desa.id), ...baru]
    for (const p of x.pengguna) {
      const sebelum = lama.find((d) => d.id === p.dusunId)
      const sesudah = baru.find((d) => d.id === p.dusunId)
      if (p.peran === 'kadus' && sebelum && sesudah && p.jabatan === jabatanBawaan('kadus', sebelum)) p.jabatan = jabatanBawaan('kadus', sesudah)
    }
  })
  return null
}

/** Nama kepala dusun dan ketua RT/RW yang diubah ikut diperbarui di pengurus Lembaga Desa (keputusan Tahap 3B). */
function selaraskanLembaga(db: DbDemo, dusun: readonly Dusun[]): void {
  for (const p of db.pengurusLembaga) {
    const d = dusun.find((x) => x.id === p.dusunId)
    if (!d) continue
    if (p.lembaga === 'perangkat' && p.jabatan === `Kepala Dusun ${angkaRomawi(d.nomor)}`) p.nama = d.kepalaDusun
    if (p.lembaga !== 'rt-rw') continue
    for (const rw of d.rw) {
      if (p.jabatan === `Ketua RW ${rw.nomor}`) p.nama = rw.ketua
      for (const rt of rw.rt) if (p.jabatan === `Ketua RT ${rt.nomor} / RW ${rw.nomor}`) p.nama = rt.ketua
    }
  }
}

/** Pengaturan nomor surat, dengan contoh dari jenis surat yang paling sering terbit (pratinjau SPEC §7.2). */
function penomoranDari(db: DbDemo, desa: Desa): Penomoran {
  const pengaturan = pengaturanDesa(db, desa.id)
  const jenis = db.jenisSurat.filter((j) => j.desaId === desa.id)
  const kodeJenis = new Map(jenis.map((j) => [j.id, j.kode]))
  const terbit = db.permohonan.filter((p) => p.desaId === desa.id && p.terbit !== null)
  const terpakai = terbit.flatMap((p) => (p.terbit ? [{ tahun: p.terbit.tahun, urut: p.terbit.urut, jenisKode: kodeJenis.get(p.jenisId) ?? '' }] : []))
  const jumlah = (id: string) => terbit.filter((p) => p.jenisId === id).length
  const contoh = [...jenis].sort((a, b) => jumlah(b.id) - jumlah(a.id) || a.kode.localeCompare(b.kode))[0]
  const tahun = Number(tanggalIsoWib(new Date()).slice(0, 4))
  const jenisKode = contoh?.kode ?? ''
  return {
    formatNomor: pengaturan.formatNomor,
    urutan: pengaturan.urutan,
    kodeSurat: desa.kodeSurat,
    contoh: {
      jenis: contoh?.nama ?? 'Surat keterangan',
      kode: contoh?.kode ?? 'SKD',
      klasifikasi: contoh?.klasifikasi ?? '470',
      urutPerTahun: urutBerikutnya(terpakai, { tahun, jenisKode, mode: 'per-tahun' }),
      urutPerJenis: urutBerikutnya(terpakai, { tahun, jenisKode, mode: 'per-jenis' }),
    },
  }
}

/** Pengaturan desa (SPEC §8): Identitas, Wilayah, dan Penomoran. Tab Pengguna ada di `pengaturan-pengguna.ts`. */
export const handlerPengaturan = [
  http.get(
    `${API}/pengaturan/desa`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = desaMilik(db, pengguna)
      return desa ? HttpResponse.json(pengaturanDesaDari(db, desa)) : desaTidakAda()
    }),
  ),
  http.put(
    `${API}/pengaturan/desa`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const isian = identitasDesaSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const desa = desaMilik(ambilDb(), pengguna)
      if (!desa) return desaTidakAda()
      ubahDb(() => {
        Object.assign(desa, isian.data)
      })
      return HttpResponse.json(pengaturanDesaDari(ambilDb(), desa))
    }),
  ),
  http.get(
    `${API}/pengaturan/wilayah`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = desaMilik(db, pengguna)
      return desa ? HttpResponse.json(wilayahDari(db, desa)) : desaTidakAda()
    }),
  ),
  http.put(
    `${API}/pengaturan/wilayah`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const isian = ubahWilayahSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const db = ambilDb()
      const desa = desaMilik(db, pengguna)
      if (!desa) return desaTidakAda()
      if (!susunanTerkunci(db, desa)) {
        const ditolak = aturSusunan(db, desa, isian.data)
        return ditolak ?? HttpResponse.json(wilayahDari(ambilDb(), desa))
      }
      const dusun = wilayahDari(db, desa).dusun
      if (!susunanSama(isian.data, dusun)) {
        return balasGalat('CONFLICT', 'Susunan wilayah sudah berubah. Muat ulang halaman, lalu ulangi perubahan.', 409)
      }
      ubahDb((d) => {
        desa.istilahWilayah = isian.data.istilah
        isian.data.dusun.forEach((baru, i) => {
          const lama = dusun[i]
          lama.nama = baru.nama
          lama.kepalaDusun = baru.kepalaDusun
          baru.rw.forEach((rw, j) => {
            lama.rw[j].ketua = rw.ketua
            rw.rt.forEach((rt, k) => {
              lama.rw[j].rt[k].ketua = rt.ketua
            })
          })
        })
        selaraskanLembaga(d, dusun)
      })
      return HttpResponse.json(wilayahDari(ambilDb(), desa))
    }),
  ),
  http.get(
    `${API}/pengaturan/penomoran`,
    denganJaringan(({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const db = ambilDb()
      const desa = desaMilik(db, pengguna)
      return desa ? HttpResponse.json(penomoranDari(db, desa)) : desaTidakAda()
    }),
  ),
  http.put(
    `${API}/pengaturan/penomoran`,
    denganJaringan(async ({ request }) => {
      const pengguna = butuhPengatur(request)
      if (pengguna instanceof Response) return pengguna
      const isian = ubahPenomoranSchema.safeParse(await bacaJson(request))
      if (!isian.success) return balasIsianTidakValid(isian.error)
      const desa = desaMilik(ambilDb(), pengguna)
      if (!desa) return desaTidakAda()
      // Hanya surat yang ditandatangani sesudah ini yang memakai format baru; nomor yang sudah terbit tidak berubah.
      ubahDb((d) => {
        const ada = d.pengaturanSurat.find((p) => p.desaId === desa.id)
        if (ada) {
          ada.formatNomor = isian.data.formatNomor
          ada.urutan = isian.data.urutan
        } else {
          d.pengaturanSurat.push({ ...pengaturanBawaan(desa.id), formatNomor: isian.data.formatNomor, urutan: isian.data.urutan })
        }
        desa.kodeSurat = isian.data.kodeSurat
      })
      return HttpResponse.json(penomoranDari(ambilDb(), desa))
    }),
  ),
]
