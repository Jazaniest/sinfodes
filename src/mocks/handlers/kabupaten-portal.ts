import { http, HttpResponse } from 'msw'
import { KATEGORI_DESA, KATEGORI_KABUPATEN, formatUkuran } from '@/domain/indeks/kategori'
import { labelPeriode, periodeTerakhirTutup } from '@/domain/indeks/periode'
import { JUMLAH_DESA_KABUPATEN } from '@/domain/kabupaten/jumlah-desa'
import type { DesaPortal, PodiumPortal, PortalKabupaten, PosisiProvinsiPortal, TitikPortal } from '@/domain/kabupaten/portal'
import { kabupatenDariLabel } from '@/domain/kabupaten/wilayah'
import type { Desa } from '@/domain/wilayah/schema'
import { ambilDb } from '../db'
import { API, balasGalat, denganJaringan } from '../http'
import { kategoriProvinsi, peringkatProvinsi } from '../indeks'
import { konteksPermintaan } from '../konteks-permintaan'
import { pastikanLencana } from '../lencana'
import { titikDesa } from '../titik-desa'

const urutNama = (a: { nama: string }, b: { nama: string }) => a.nama.localeCompare(b.nama, 'id')
const bergabung = (d: Desa): d is Desa & { status: DesaPortal['status'] } => d.status === 'Aktif' || d.status === 'Uji coba'

/** Portal publik kabupaten (SPEC-V0.2 §8.2): terbuka tanpa masuk, kabupatennya dari alamat. */
export const handlerPortalKabupaten = [
  http.get(
    `${API}/kabupaten/portal`,
    denganJaringan(({ request }) => {
      const k = konteksPermintaan(request)
      const wilayah = k.jenis === 'kabupaten' ? kabupatenDariLabel(k.label) : null
      if (k.jenis !== 'kabupaten' || !wilayah) return balasGalat('NOT_FOUND', 'Alamat tidak dikenal.', 404)
      const kabupaten = { ...wilayah, label: k.label }
      const db = ambilDb()
      if (!db.kabupatenMitra.some((m) => m.label === k.label)) {
        return HttpResponse.json({ mitra: false, kabupaten } satisfies PortalKabupaten)
      }
      const sekarang = new Date()
      pastikanLencana(sekarang)
      const semua = db.desa.filter((d) => d.kabupaten.kode === wilayah.kode)
      // Publik hanya melihat periode tutup: podium dibaca dari lencana yang sudah terbit, tidak pernah dari klasemen sementara.
      const periode = periodeTerakhirTutup('bulanan', sekarang)
      const podium: PodiumPortal = {
        periode: { kode: periode.kode, label: labelPeriode(periode) },
        kategori: KATEGORI_DESA.map((kategori) => ({
          kategori,
          juara: db.lencana
            .filter((l) => l.tingkat === 'kabupaten' && l.wilayah.kode === wilayah.kode && l.kategori === kategori && l.periode.musim === periode.musim && l.periode.kode === periode.kode)
            .flatMap((l) => {
              const desa = semua.find((d) => d.id === l.desaId)
              return desa ? [{ peringkat: l.peringkat, bersama: l.bersama, desa: { nama: desa.nama, kecamatan: desa.kecamatan.nama, alamat: desa.slug }, nilai: formatUkuran(kategori, l.nilai) }] : []
            })
            .sort((a, b) => a.peringkat - b.peringkat || a.desa.nama.localeCompare(b.desa.nama, 'id')),
        })),
      }
      const provinsi = semua[0]?.provinsi
      const nilaiProvinsi = provinsi ? peringkatProvinsi(db, provinsi.kode, periode, sekarang) : []
      const posisiProvinsi: PosisiProvinsiPortal = provinsi
        ? KATEGORI_KABUPATEN.flatMap((kategori) => {
            const posisi = kategoriProvinsi(kategori, nilaiProvinsi, wilayah.kode).posisi
            return posisi && posisi.peringkat <= 3 ? [{ kategori, peringkat: posisi.peringkat, bersama: posisi.bersama, dari: posisi.dari, provinsi: provinsi.nama }] : []
          })
        : []
      const perKecamatan = new Map<string, { kecamatan: Desa['kecamatan']; desa: DesaPortal[] }>()
      for (const d of semua.filter(bergabung)) {
        const kec = perKecamatan.get(d.kecamatan.kode) ?? { kecamatan: d.kecamatan, desa: [] }
        kec.desa.push({ label: d.slug, nama: d.nama, status: d.status })
        perKecamatan.set(d.kecamatan.kode, kec)
      }
      const kecamatan = [...perKecamatan.values()]
        .sort((a, b) => urutNama(a.kecamatan, b.kecamatan))
        .map((kec) => ({ kecamatan: { kode: kec.kecamatan.kode, nama: kec.kecamatan.nama }, desa: kec.desa.sort(urutNama) }))
      const peta: TitikPortal[] = semua
        .filter((d) => bergabung(d) || d.status === 'Persiapan')
        .flatMap((d) => {
          const titik = titikDesa(db, d)
          if (!titik) return []
          const ikut = bergabung(d)
          return [{ label: ikut ? d.slug : null, nama: d.nama, kecamatan: d.kecamatan.nama, kelompok: ikut ? 'bergabung' : 'persiapan', titik }] as const
        })
        .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan, 'id') || a.nama.localeCompare(b.nama, 'id'))
      const hasil: PortalKabupaten = {
        mitra: true,
        kabupaten,
        bergabung: kecamatan.reduce((n, kec) => n + kec.desa.length, 0),
        // Sama dengan Ringkasan dasbor: kabupaten tanpa angka resmi memakai jumlah desa pelanggannya.
        jumlahDesa: JUMLAH_DESA_KABUPATEN[wilayah.kode] ?? semua.length,
        kecamatan,
        peta,
        podium,
        posisiProvinsi,
      }
      return HttpResponse.json(hasil)
    }),
  ),
]
