import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { PESAN_PASSPHRASE_BELUM_ADA, PESAN_PASSPHRASE_SALAH } from '@sinfodes/kontrak/surat/passphrase'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import type { Penyandi } from '../../kripto/penyandi'
import { GalatApp, GalatDisimpan } from '../../galat'
import { hashKataSandi } from '../../kripto/kata-sandi'
import { PESAN_TERLALU_SERING } from '../../lapisan/batas-laju'
import { periksaPassphrase, type KonteksPassphrase } from './layanan'

// Menghitung verifikasi argon2 yang benar-benar dijalankan, untuk membuktikan "paling banyak lima" dan "terkunci tanpa argon2".
const verifikasi = vi.hoisted(() => ({ n: 0 }))
vi.mock('../../kripto/kata-sandi', async (asli) => {
  const m = await asli<typeof import('../../kripto/kata-sandi')>()
  return {
    ...m,
    periksaKataSandi: (...args: Parameters<typeof m.periksaKataSandi>) => {
      verifikasi.n++
      return m.periksaKataSandi(...args)
    },
  }
})

const DESA_SS = 'desa_sungai_sialang'
const KADES = 'pgn_nasir'
const SEKDES = 'pgn_hendri'
const BENAR = 'sialang2026'

let uji: DbUji
let penyandi: Penyandi
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
})
afterAll(async () => {
  await uji?.tutup()
})
beforeEach(async () => {
  verifikasi.n = 0
  await uji.sqlMigrasi`delete from passphrase_tanda_tangan`
  await uji.sqlMigrasi`delete from kunci_masuk_desa where jenis = 'passphrase'`
  await uji.sqlMigrasi`delete from jejak_audit where jenis like 'passphrase.%'`
})

const atur = async (penggunaId: string, passphrase = BENAR) => {
  await uji.sqlMigrasi`insert into passphrase_tanda_tangan (pengguna_id, desa_id, hash, diatur_pada)
    values (${penggunaId}, ${DESA_SS}, ${await hashKataSandi(passphrase)}, ${SEKARANG_UJI})
    on conflict (pengguna_id) do update set hash = excluded.hash`
}
/**
 * Satu "permintaan": transaksi peran desa yang memanggil periksaPassphrase. Galat ditangkap lalu transaksi di-commit, seperti
 * `lapisanTransaksi` untuk GalatDisimpan; galat lain membatalkan (dilempar ulang).
 */
const periksa = (penggunaId: string, passphrase: string, sekarang = SEKARANG_UJI, permohonanId?: string) =>
  uji.klien.dalamTransaksi('desa', { desaId: DESA_SS }, async (db) => {
    const k: KonteksPassphrase = { db, penyandi, pelaku: { id: penggunaId, desaId: DESA_SS }, sekarang, permohonanId }
    try {
      await periksaPassphrase(k, passphrase)
      return null
    } catch (e) {
      if (e instanceof GalatDisimpan) return e
      throw e
    }
  })
const kunciDb = async (pengguna = KADES) => {
  const kunci = penyandi.indeks(pengguna, `passphrase.pengguna:${DESA_SS}`)
  return (await uji.sqlMigrasi`select gagal, kali_terkunci from kunci_masuk_desa where desa_id = ${DESA_SS} and jenis = 'passphrase' and kunci = ${kunci}`).map((b) => ({ ...b }))
}
const auditGagal = async () => (await uji.sqlMigrasi`select pelaku, ringkasan from jejak_audit where jenis = 'passphrase.gagal'`).map((b) => ({ ...b }))

describe('periksaPassphrase (rencana 8F2b Tugas 3, Ruling 3-5)', () => {
  it('belum ada passphrase: 422 pada field passphrase, tidak dihitung dan tidak ada jejak', async () => {
    let galat: unknown
    await uji.klien
      .dalamTransaksi('desa', { desaId: DESA_SS }, (db) =>
        periksaPassphrase({ db, penyandi, pelaku: { id: KADES, desaId: DESA_SS }, sekarang: SEKARANG_UJI }, BENAR),
      )
      .catch((e: unknown) => (galat = e))
    expect(galat).toBeInstanceOf(GalatApp)
    expect(galat).toMatchObject({ status: 422, kode: 'VALIDATION', message: PESAN_PASSPHRASE_BELUM_ADA, fields: { passphrase: PESAN_PASSPHRASE_BELUM_ADA } })
    expect(await kunciDb()).toEqual([])
    expect(await auditGagal()).toEqual([])
    expect(verifikasi.n).toBe(0)
  })

  it('benar: lolos, dan menghapus hitungan yang ada', async () => {
    await atur(KADES)
    expect((await periksa(KADES, 'salah-salah'))?.status).toBe(422)
    expect((await periksa(KADES, 'salah-lagi!'))?.status).toBe(422)
    expect((await kunciDb())[0].gagal).toBe(2)
    expect(await periksa(KADES, BENAR)).toBeNull()
    expect(await kunciDb()).toEqual([])
  })

  it('salah: GalatDisimpan 422 pada field passphrase; hitungan dan jejak tersimpan; jejak tanpa isi passphrase', async () => {
    await atur(KADES)
    const g = await periksa(KADES, 'tebakan-rahasia-9', SEKARANG_UJI, 'srt_x')
    expect(g).toBeInstanceOf(GalatDisimpan)
    expect(g).toMatchObject({ status: 422, kode: 'VALIDATION', message: PESAN_PASSPHRASE_SALAH, fields: { passphrase: PESAN_PASSPHRASE_SALAH } })
    expect(await kunciDb()).toEqual([{ gagal: 1, kali_terkunci: 0 }])
    const audit = await auditGagal()
    expect(audit).toEqual([{ pelaku: KADES, ringkasan: { alasan: 'passphrase-salah', permohonanId: 'srt_x' } }])
    expect(JSON.stringify(audit)).not.toContain('tebakan-rahasia-9')
  })

  it('lima salah mengunci: yang kelima 429, sesudahnya benar pun 429 tanpa argon2 dan tanpa jejak baru; pulih setelah waktunya', async () => {
    await atur(KADES)
    const hasil = []
    for (let i = 1; i <= 5; i++) hasil.push(await periksa(KADES, `salah-ke-${i}`))
    expect(hasil.map((g) => g?.status)).toEqual([422, 422, 422, 422, 429])
    expect(hasil[4]?.message).toBe(PESAN_TERLALU_SERING)
    expect(verifikasi.n).toBe(5)
    expect(await auditGagal()).toHaveLength(5)
    const terkunci = await periksa(KADES, BENAR)
    expect(terkunci).toMatchObject({ status: 429, message: PESAN_TERLALU_SERING })
    expect(verifikasi.n).toBe(5)
    expect(await auditGagal()).toHaveLength(5)
    // Sesudah 15 menit kunci habis; passphrase benar lolos dan menghapus hitungan.
    const nanti = new Date(SEKARANG_UJI.getTime() + 15 * 60_000 + 1000)
    expect(await periksa(KADES, BENAR, nanti)).toBeNull()
    expect(await kunciDb()).toEqual([])
  })

  it('akun lain tidak ikut terkunci', async () => {
    await atur(KADES)
    await atur(SEKDES)
    for (let i = 1; i <= 5; i++) await periksa(KADES, `salah-ke-${i}`)
    expect((await periksa(KADES, BENAR))?.status).toBe(429)
    expect(await periksa(SEKDES, BENAR)).toBeNull()
    expect(await kunciDb(SEKDES)).toEqual([])
  })

  it('dua puluh tebakan salah serentak: tepat lima verifikasi argon2 dan lima jejak, sisanya 429 (kunci pengguna)', async () => {
    await atur(KADES)
    const hasil = await Promise.all(Array.from({ length: 20 }, (_, i) => periksa(KADES, `tebakan-${i}`)))
    expect(hasil.every((g) => g instanceof GalatDisimpan)).toBe(true)
    expect(hasil.filter((g) => g?.status === 422)).toHaveLength(4)
    expect(hasil.filter((g) => g?.status === 429)).toHaveLength(16)
    expect(verifikasi.n).toBe(5)
    expect(await auditGagal()).toHaveLength(5)
    // Setelah terkunci, passphrase benar pun ditolak.
    expect((await periksa(KADES, BENAR))?.status).toBe(429)
  })
})
