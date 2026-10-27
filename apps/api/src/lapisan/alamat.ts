import { bacaAlamat } from '@sinfodes/kontrak/alamat/alamat'
import { kabupatenDariLabel } from '@sinfodes/kontrak/kabupaten/wilayah'
import type { MiddlewareHandler } from 'hono'
import { cariDesaMenurutSlug, cariSlugDariAlias } from '../basisdata/desa'
import { cariKabupatenMitra } from '../basisdata/kabupaten'
import type { Klien } from '../basisdata/klien'
import type { Waktu } from '../waktu'
import type { AlamatPermintaan, LingkunganApp } from './konteks'

/** Hasil pencarian alamat disimpan singkat: perubahan status desa terlihat dalam batas ini. */
export const TTL_ALAMAT_MS = 30_000
/** Batas isi cache: label acak dari penyerang (wildcard DNS) tidak boleh menumbuhkan memori tanpa batas. */
const MAKS_ENTRI = 500

type Hasil = Pick<AlamatPermintaan, 'desa' | 'labelBaru' | 'kabupaten'>
const KOSONG: Hasil = { desa: null, labelBaru: null, kabupaten: null }

/**
 * Host dibaca dari URL permintaan saja (SPEC-V0.3 §6.2); `X-Forwarded-Host` dan sejenisnya tidak pernah dibaca, karena
 * Host menentukan desa mana yang boleh dibuka cookie-nya. Pencarian memakai peran `publik` (hanya SELECT `desa`, `alias_alamat`,
 * dan `kabupaten_mitra`).
 */
export function lapisanAlamat(deps: { klien: Klien; domainInduk: string; waktu: Waktu }): MiddlewareHandler<LingkunganApp> {
  const cache = new Map<string, { nilai: Hasil; sampai: number }>()

  const dengan = async (kunci: string, isi: () => Promise<Hasil>): Promise<Hasil> => {
    const sekarang = deps.waktu().getTime()
    const ada = cache.get(kunci)
    if (ada && ada.sampai > sekarang) return ada.nilai
    const nilai = await isi()
    if (cache.size >= MAKS_ENTRI) cache.delete(cache.keys().next().value as string)
    cache.set(kunci, { nilai, sampai: sekarang + TTL_ALAMAT_MS })
    return nilai
  }

  const cariDesa = (label: string): Promise<Hasil> =>
    dengan(`desa:${label}`, () =>
      deps.klien.dalamTransaksi('publik', {}, async (db): Promise<Hasil> => {
        const desa = await cariDesaMenurutSlug(db, label)
        if (desa) return { ...KOSONG, desa }
        return { ...KOSONG, labelBaru: await cariSlugDariAlias(db, label) }
      }),
    )

  const cariKabupaten = (label: string): Promise<Hasil> =>
    dengan(`kab:${label}`, async () => {
      const mitra = await deps.klien.dalamTransaksi('publik', {}, (db) => cariKabupatenMitra(db, label))
      if (mitra) return { ...KOSONG, kabupaten: { ...mitra, mitra: true } }
      const wilayah = kabupatenDariLabel(label)
      return { ...KOSONG, kabupaten: wilayah ? { ...wilayah, label, mitra: false } : null }
    })

  return async (c, next) => {
    const konteks = bacaAlamat(new URL(c.req.url).hostname, deps.domainInduk)
    const hasil = konteks.jenis === 'desa' ? await cariDesa(konteks.label) : konteks.jenis === 'kabupaten' ? await cariKabupaten(konteks.label) : KOSONG
    c.set('alamat', { konteks, ...hasil })
    await next()
  }
}
