import { describe, expect, it } from 'vitest'
import { pengaduanSchema } from '@sinfodes/kontrak/pengaduan/schema'
import { bangkitkanDb } from './index'

const ACUAN = new Date('2026-09-24T02:00:00Z')
const db = bangkitkanDb(ACUAN)
const hitung = (status: string) => db.pengaduan.filter((a) => a.status === status).length

describe('pengaduan demo (SPEC §12.6)', () => {
  it('30 pengaduan dalam 6 bulan: Baru 2, Ditanggapi 3, Selesai 25; semuanya sah dan bernomor unik', () => {
    expect(db.pengaduan).toHaveLength(30)
    expect([hitung('baru'), hitung('ditanggapi'), hitung('selesai')]).toEqual([2, 3, 25])
    const enamBulanLalu = ACUAN.getTime() - 183 * 86_400_000
    for (const a of db.pengaduan) {
      expect(pengaduanSchema.parse(a)).toEqual(a)
      const masuk = new Date(a.masukPada).getTime()
      expect(masuk).toBeGreaterThanOrEqual(enamBulanLalu)
      expect(masuk).toBeLessThanOrEqual(ACUAN.getTime())
    }
    expect(new Set(db.pengaduan.map((a) => a.nomor)).size).toBe(30)
  })
  it('percakapan urut waktu dan dimulai pesan warga; tanggapan pertama = balasan desa pertama', () => {
    for (const a of db.pengaduan) {
      const waktu = a.percakapan.map((e) => e.waktu)
      expect(waktu).toEqual([...waktu].sort())
      expect(a.percakapan[0].jenis).toBe('warga')
      expect(a.tanggapanPertamaPada).toBe(a.percakapan.find((e) => e.jenis === 'desa')?.waktu ?? null)
      expect(a.selesaiPada !== null).toBe(a.status === 'selesai')
      if (a.status === 'selesai') expect(a.percakapan.at(-1)).toMatchObject({ jenis: 'status', status: 'selesai' })
    }
  })
  it('dua pengaduan Baru untuk alur demo: satu di Dusun II, satu jalan berlubang dari Zulkifli di Dusun III', () => {
    const baru = db.pengaduan.filter((a) => a.status === 'baru')
    expect(baru.map((a) => a.dusunId).sort()).toEqual(['dsn_ss_2', 'dsn_ss_3'])
    expect(baru.find((a) => a.dusunId === 'dsn_ss_3')).toMatchObject({
      pelapor: { pendudukId: 'pdk_zulkifli' },
      judul: 'Jalan berlubang di RT 012',
    })
    expect(baru.every((a) => a.percakapan.length === 1 && a.tanggapanPertamaPada === null)).toBe(true)
  })
  it('Siti Rahmah punya tepat satu pengaduan, sudah selesai (untuk layanan warga di Tahap 4)', () => {
    expect(db.pengaduan.filter((a) => a.pelapor.pendudukId === 'pdk_siti_rahmah').map((a) => a.status)).toEqual(['selesai'])
  })
  it('setiap pengaduan tercatat masuk di aktivitas; satu di antaranya hari ini', () => {
    const masuk = db.aktivitas.filter((x) => x.jenis === 'pengaduan-masuk')
    expect(masuk).toHaveLength(30)
    expect(masuk.every((x) => x.rujukan?.jenis === 'pengaduan')).toBe(true)
    expect(masuk.filter((x) => x.waktu.startsWith('2026-09-24'))).toHaveLength(1)
  })
})
