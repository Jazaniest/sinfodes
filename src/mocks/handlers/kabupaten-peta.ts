import { http, HttpResponse } from 'msw'
import type { PetaKabupaten, TitikPetaKabupaten } from '@/domain/kabupaten/peta'
import { ambilDb } from '../db'
import { API, denganJaringan } from '../http'
import { danaDesaKabupaten, desaDiKabupaten } from '../kabupaten-angka'
import { angkaKonsolDesa } from '../konsol-angka'
import { butuhKemampuanKabupaten } from '../sesi-mock'
import { titikDesa } from '../titik-desa'

/** Peta dasbor kabupaten (SPEC-V0.2 §8.3 butir 5): titik desa dengan angka Dana Desa yang sama dengan layar Dana Desa. */
export const handlerKabupatenPeta = [
  http.get(
    `${API}/kabupaten/peta`,
    denganJaringan(({ request }) => {
      const akun = butuhKemampuanKabupaten(request, 'kab.lihat', 'Akun ini tidak berhak membuka dasbor kabupaten.')
      if (akun instanceof Response) return akun
      const db = ambilDb()
      const sekarang = new Date()
      const dana = danaDesaKabupaten(db, akun.kabupatenKode, sekarang)
      const perDesa = new Map(dana.kecamatan.flatMap((k) => k.desa).map((d) => [d.id, d]))
      const desa: TitikPetaKabupaten[] = []
      let tanpaTitik = 0
      for (const d of desaDiKabupaten(db, akun.kabupatenKode)) {
        const titik = titikDesa(db, d)
        if (!titik) {
          tanpaTitik++
          continue
        }
        const a = angkaKonsolDesa(db, d, sekarang)
        const x = perDesa.get(d.id)
        desa.push({
          id: d.id, nama: d.nama, alamat: d.slug, kecamatan: d.kecamatan.nama, status: d.status, titik, jiwa: a.jiwa,
          suratBulanIni: a.suratBulanIni, apbdes: x?.apbdes ?? null, tertinggal: x?.tertinggal ?? false,
        })
      }
      desa.sort((a, b) => a.kecamatan.localeCompare(b.kecamatan, 'id') || a.nama.localeCompare(b.nama, 'id'))
      const hasil: PetaKabupaten = { kabupaten: dana.kabupaten, medianRealisasi: dana.medianRealisasi, desa, tanpaTitik }
      return HttpResponse.json(hasil)
    }),
  ),
]
