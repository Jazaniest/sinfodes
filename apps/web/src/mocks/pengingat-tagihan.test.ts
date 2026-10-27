// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { kirimBukti } from '@/api/langganan'
import { ambilBeranda } from '@/api/beranda'
import { ambilNotifikasi } from '@/api/notifikasi'
import { formatRupiah } from '@/domain/format/angka'
import { kalimatPengingatTagihan } from '@/domain/langganan/pengingat'
import { hrefNotifikasi } from '@/domain/notifikasi/schema'
import type { PenggunaSesi } from '@/domain/pengguna/schema'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { ambilDb } from './db'
import { notifikasiTagihanBaru, pengingatTagihanDesa } from './pengingat-tagihan'

pakaiApiTiruan({ dbSegarTiapUji: true })

const pada = (tanggal: string) => vi.setSystemTime(new Date(`${tanggal}T03:00:00Z`))
const tagihanTerbit = () => ambilDb().tagihan.find((t) => t.desaId === ID_SUNGAI_SIALANG && t.status === 'terbit')!
const tagihanNotif = async () => (await ambilNotifikasi()).data.filter((n) => n.jenis === 'tagihan')
/** Jalankan `uji` pada tanggal tertentu, lalu kembalikan jam palsu ke tanggal uji bersama. */
async function dipanggilPada(tanggal: string, uji: () => Promise<void>) {
  pada(tanggal)
  try {
    await uji()
  } finally {
    vi.setSystemTime(SEKARANG_UJI)
  }
}

describe('pengingat tagihan di Beranda dan notifikasi (rencana 7D-1 Tugas 4)', () => {
  it('21 hari sebelum jatuh tempo (tanggal uji): belum ada pita dan belum ada notifikasi', async () => {
    masukSebagai(AKUN_UJI.kades)
    expect((await ambilBeranda()).pengingatTagihan).toBeNull()
    expect(await tagihanNotif()).toEqual([])
  })
  it('H-14 (2026-10-01): mendekati dengan kalimat persis, dan satu notifikasi H-14 bertautan ke Langganan', async () => {
    masukSebagai(AKUN_UJI.kades)
    await dipanggilPada('2026-10-01', async () => {
      const t = tagihanTerbit()
      const b = await ambilBeranda()
      expect(b.pengingatTagihan).toEqual({ tagihanId: t.id, periode: 'Triwulan IV 2026', nominal: t.nominal, jatuhTempo: '2026-10-15', keadaan: 'mendekati', sisaHari: 14 })
      const kalimat = `Tagihan Triwulan IV 2026 sebesar ${formatRupiah(t.nominal)} jatuh tempo 14 hari lagi, 15 Oktober 2026.`
      expect(kalimatPengingatTagihan('mendekati', b.pengingatTagihan!)).toBe(kalimat)
      const notif = await tagihanNotif()
      expect(notif).toHaveLength(1)
      expect(notif[0]).toMatchObject({
        id: `ntf_tgh_${t.id}_14_pgn_nasir`,
        judul: 'Tagihan Triwulan IV 2026',
        dibaca: false,
        rujukan: { jenis: 'tagihan', id: t.id },
        isi: kalimat,
        waktu: '2026-10-01T07:00:00+07:00',
      })
      expect(hrefNotifikasi(notif[0])).toBe('/admin/pengaturan/langganan')
    })
  })
  it('membuka notifikasi dua kali, atau di hari lain dengan ambang sama, tidak menggandakan', async () => {
    masukSebagai(AKUN_UJI.kades)
    await dipanggilPada('2026-10-01', async () => {
      await tagihanNotif()
      expect(await tagihanNotif()).toHaveLength(1)
    })
    await dipanggilPada('2026-10-03', async () => {
      expect(await tagihanNotif()).toHaveLength(1)
    })
  })
  it('ambang berikutnya menambah satu notifikasi: H-7, H-1, dan hari jatuh tempo', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    const id = (a: number) => `ntf_tgh_${tagihanTerbit().id}_${a}_pgn_nurhayati`
    for (const [tanggal, ambang] of [['2026-10-01', 14], ['2026-10-08', 7], ['2026-10-14', 1], ['2026-10-15', 0]] as const) {
      await dipanggilPada(tanggal, async () => {
        const harap = [14, 7, 1, 0].filter((a) => a >= ambang).map(id)
        expect((await tagihanNotif()).map((n) => n.id).sort()).toEqual(harap.sort())
      })
    }
  })
  it('dibuka pertama kali sesudah jatuh tempo: hanya satu notifikasi, bukan empat', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await dipanggilPada('2026-10-20', async () => {
      expect(await tagihanNotif()).toHaveLength(1)
    })
  })
  it('hari jatuh tempo → hari-ini; sehari sesudahnya → lewat', async () => {
    masukSebagai(AKUN_UJI.kades)
    await dipanggilPada('2026-10-15', async () => {
      expect((await ambilBeranda()).pengingatTagihan).toMatchObject({ keadaan: 'hari-ini', sisaHari: 0 })
    })
    await dipanggilPada('2026-10-16', async () => {
      const lewat = (await ambilBeranda()).pengingatTagihan!
      expect(lewat).toMatchObject({ keadaan: 'lewat', sisaHari: -1 })
      expect(kalimatPengingatTagihan('lewat', lewat)).toMatch(/ lewat jatuh tempo sejak 15 Oktober 2026\.$/)
      expect(kalimatPengingatTagihan('hari-ini', lewat)).toMatch(/ jatuh tempo hari ini\.$/)
    })
  })
  it('Operator dan Kepala Dusun: tanpa pita dan tanpa notifikasi', async () => {
    await dipanggilPada('2026-10-10', async () => {
      for (const akun of [AKUN_UJI.operator, AKUN_UJI.kadus]) {
        masukSebagai(akun)
        expect((await ambilBeranda()).pengingatTagihan).toBeNull()
        expect(await tagihanNotif()).toEqual([])
      }
    })
  })
  it('setelah unggah bukti: pita berganti menjadi diperiksa, tanpa notifikasi baru', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    await dipanggilPada('2026-10-10', async () => {
      const t = tagihanTerbit()
      const isian = { tanggalTransfer: '2026-10-09', namaPengirim: 'Pemdes', nominalTransfer: t.nominal }
      await kirimBukti(t.id, isian, new File([new Uint8Array(10)], 'a.png', { type: 'image/png' }))
      const b = await ambilBeranda()
      expect(b.pengingatTagihan).toMatchObject({ keadaan: 'diperiksa', tagihanId: t.id })
      expect(kalimatPengingatTagihan('diperiksa', b.pengingatTagihan!)).toBe('Bukti pembayaran tagihan Triwulan IV 2026 sedang diperiksa Tim Sinfodes.')
      expect(await tagihanNotif()).toEqual([])
    })
  })
  it('fungsi murni tidak menulis; tagihan lunas tidak diingatkan; desa tanpa tagihan null', () => {
    const db = ambilDb()
    expect(pengingatTagihanDesa(db, 'desa_tanjung_lamo', '2026-10-10')).toBeNull()
    const pengguna = { id: 'pgn_nasir', desaId: ID_SUNGAI_SIALANG, peran: 'kades', nama: 'Nasir' } as PenggunaSesi
    const sebelum = structuredClone(db.tagihan)
    expect(notifikasiTagihanBaru(db, pengguna, new Date('2026-10-10T03:00:00Z'))).toHaveLength(1)
    expect(db.tagihan).toEqual(sebelum)
    tagihanTerbit().status = 'lunas'
    expect(pengingatTagihanDesa(db, ID_SUNGAI_SIALANG, '2026-10-10')).toBeNull()
    expect(notifikasiTagihanBaru(db, pengguna, new Date('2026-10-10T03:00:00Z'))).toEqual([])
  })
})
