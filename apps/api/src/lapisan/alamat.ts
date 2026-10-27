import { bacaAlamat } from '@sinfodes/kontrak/alamat/alamat'
import type { MiddlewareHandler } from 'hono'
import { cariDesaMenurutSlug, cariSlugDariAlias } from '../basisdata/desa'
import type { Klien } from '../basisdata/klien'
import type { Waktu } from '../waktu'
import type { AlamatPermintaan, LingkunganApp } from './konteks'

/** Hasil pencarian alamat disimpan singkat: perubahan status desa terlihat dalam batas ini. */
export const TTL_ALAMAT_MS = 30_000
/** Batas isi cache: label acak dari penyerang (wildcard DNS) tidak boleh menumbuhkan memori tanpa batas. */
const MAKS_ENTRI = 500

type Hasil = Pick<AlamatPermintaan, 'desa' | 'labelBaru'>

/**
 * Host dibaca dari URL permintaan saja (SPEC-V0.3 §6.2); `X-Forwarded-Host` dan sejenisnya tidak pernah dibaca, karena
 * Host menentukan desa mana yang boleh dibuka cookie-nya. Pencarian memakai peran `publik` (hanya SELECT `desa` dan `alias_alamat`).
 */
export function lapisanAlamat(deps: { klien: Klien; domainInduk: string; waktu: Waktu }): MiddlewareHandler<LingkunganApp> {
  const cache = new Map<string, { nilai: Hasil; sampai: number }>()

  const cari = async (label: string): Promise<Hasil> => {
    const sekarang = deps.waktu().getTime()
    const ada = cache.get(label)
    if (ada && ada.sampai > sekarang) return ada.nilai
    const nilai = await deps.klien.dalamTransaksi('publik', {}, async (db): Promise<Hasil> => {
      const desa = await cariDesaMenurutSlug(db, label)
      if (desa) return { desa, labelBaru: null }
      return { desa: null, labelBaru: await cariSlugDariAlias(db, label) }
    })
    if (cache.size >= MAKS_ENTRI) cache.delete(cache.keys().next().value as string)
    cache.set(label, { nilai, sampai: sekarang + TTL_ALAMAT_MS })
    return nilai
  }

  return async (c, next) => {
    const konteks = bacaAlamat(new URL(c.req.url).hostname, deps.domainInduk)
    const hasil: Hasil = konteks.jenis === 'desa' ? await cari(konteks.label) : { desa: null, labelBaru: null }
    c.set('alamat', { konteks, ...hasil })
    await next()
  }
}
