import { statusPassphraseSchema } from '@sinfodes/kontrak/surat/passphrase'
import { Hono } from 'hono'
import type { Penyandi } from '../../kripto/penyandi'
import { butuhAkses } from '../../lapisan/akses'
import type { LingkunganApp } from '../../lapisan/konteks'
import { aturPassphrase, statusPassphrase } from './layanan'

const PESAN_TIDAK_BERHAK = 'Peran Anda tidak menandatangani surat.'

/**
 * Passphrase tanda tangan (Ruling 1 tahap 8F2b), dipasang di /api/v1/sesi/passphrase-tanda-tangan. GET status dan PUT menetapkan
 * atau mengganti; keduanya untuk peran yang boleh menandatangani. Hash tidak pernah keluar dari server.
 */
export function rutePassphrase(deps: { penyandi: Penyandi }): Hono<LingkunganApp> {
  const rute = new Hono<LingkunganApp>()

  rute.get('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'surat.tandatangani', PESAN_TIDAK_BERHAK)
    return c.json(statusPassphraseSchema.parse({ diatur: await statusPassphrase(db, pelaku.id) }))
  })

  rute.put('/', async (c) => {
    const { db, pelaku } = butuhAkses(c, 'surat.tandatangani', PESAN_TIDAK_BERHAK)
    const mentah = await c.req.json().catch(() => null)
    const hasil = await aturPassphrase({ db, penyandi: deps.penyandi, pelaku, sekarang: c.get('waktu')() }, mentah)
    return c.json(statusPassphraseSchema.parse(hasil))
  })

  return rute
}
