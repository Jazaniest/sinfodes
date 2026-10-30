import { describe, expect, it } from 'vitest'
import type { Db } from '../../basisdata/klien'
import { efekSuratBawaan } from './efek-surat'

describe('efekSuratBawaan (rencana 8F2b Ruling 17)', () => {
  it('suratDitandatangani dan suratDikembalikan tidak melakukan apa pun sampai 8G', async () => {
    const db = {} as Db
    const permohonan = { id: 'srt_1', desaId: 'desa_a', dusunId: 'dsn_a' }
    const jenis = { id: 'js_1', kode: 'SKD' }
    const pemohon = { id: 'pdk_1', nama: 'Siti Rahmah' }
    const oleh = { id: 'pgn_nasir', nama: 'H. Muhammad Nasir' }
    await expect(efekSuratBawaan.suratDitandatangani(db, permohonan, jenis, pemohon, '400/012/SS/X/2026', oleh)).resolves.toBeUndefined()
    await expect(efekSuratBawaan.suratDikembalikan(db, permohonan, jenis, pemohon, 'Lengkapi foto KTP.', oleh)).resolves.toBeUndefined()
  })
})
