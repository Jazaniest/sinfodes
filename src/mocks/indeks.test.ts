import { describe, expect, it } from 'vitest'
import { hitungHasilDesa } from '@/domain/indeks/hitung'
import { bulat1 } from '@/domain/indeks/kategori'
import { bulanPeriode, type Periode } from '@/domain/indeks/periode'
import type { Pengaduan } from '@/domain/pengaduan/schema'
import { pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { ID_SUNGAI_SIALANG } from './data/desa-demo'
import { ambilDb, ubahDb } from './db'
import { aktifSepanjang, barisUkuran, bekukanBulanTutup, hasilDesaPeriode, papanKabupaten, peringkatProvinsi, podiumKabupaten, ukuranBulanPanel } from './indeks'
import { bergabungPada, desaDiKabupaten } from './kabupaten-angka'

pakaiApiTiruan({ dbSegarTiapUji: true })

const AGUSTUS: Periode = { musim: 'bulanan', kode: '2026-08' }
const SEPTEMBER: Periode = { musim: 'bulanan', kode: '2026-09' }
const T3: Periode = { musim: 'triwulan', kode: '2026-T3' }
const desaSialang = () => ambilDb().desa.find((d) => d.id === ID_SUNGAI_SIALANG)!
const tambahPengaduan = (id: string, balasan: { id: string; waktu: string; isi: string }[]) =>
  ubahDb((db) => {
    const contoh = db.pengaduan.find((a) => a.desaId === ID_SUNGAI_SIALANG)!
    const baru: Pengaduan = {
      ...structuredClone(contoh),
      id,
      nomor: `ADU-2026-9${id.slice(-2)}`,
      masukPada: '2026-09-10T08:00:00+07:00',
      status: 'baru',
      tanggapanPertamaPada: null,
      selesaiPada: null,
      percakapan: [
        { jenis: 'warga', id: `${id}_w`, waktu: '2026-09-10T08:00:00+07:00', isi: 'Mohon dicek.', foto: null },
        ...balasan.map((b) => ({ jenis: 'desa' as const, id: b.id, waktu: b.waktu, isi: b.isi, oleh: { id: 'pgn_rosmiati', nama: 'Rosmiati' }, jabatan: 'Operator Desa' })),
      ],
    }
    db.pengaduan.push(baru)
  })

describe('definisi jejak desa panel (keputusan 7C-1 butir 6)', () => {
  it('balasan 19 karakter tidak dihitung, 20 karakter dihitung', () => {
    const sebelum = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).responsif
    tambahPengaduan('adu_uji_a1', [{ id: 'bls_a1', waktu: '2026-09-10T10:00:00+07:00', isi: 'a'.repeat(19) }])
    const pendek = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).responsif
    expect(pendek.pengaduan).toBe(sebelum.pengaduan + 1)
    expect(pendek.dibalas).toBe(sebelum.dibalas)
    tambahPengaduan('adu_uji_a2', [{ id: 'bls_a2', waktu: '2026-09-10T10:00:00+07:00', isi: 'b'.repeat(20) }])
    expect(ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).responsif.dibalas).toBe(sebelum.dibalas + 1)
  })
  it('balasan yang sama persis dengan balasan sebelumnya tidak dihitung, walau beda huruf dan spasi', () => {
    const sebelum = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).responsif.dibalas
    tambahPengaduan('adu_uji_b1', [{ id: 'bls_b1', waktu: '2026-09-10T10:00:00+07:00', isi: 'Terima kasih sudah melapor, segera kami cek ke lokasi.' }])
    tambahPengaduan('adu_uji_b2', [{ id: 'bls_b2', waktu: '2026-09-11T10:00:00+07:00', isi: '  TERIMA kasih  sudah melapor,   segera kami cek ke lokasi. ' }])
    expect(ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).responsif.dibalas).toBe(sebelum + 1)
  })
  it('mutasi dicatat 31 hari setelah peristiwa tidak tepat waktu, 30 hari tepat', () => {
    const awal = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).data
    ubahDb((db) => {
      const contoh = db.mutasi.find((m) => m.desaId === ID_SUNGAI_SIALANG)!
      db.mutasi.push({ ...structuredClone(contoh), id: 'mut_uji_30', tanggal: '2026-08-10', dicatatPada: '2026-09-09T09:00:00+07:00' })
      db.mutasi.push({ ...structuredClone(contoh), id: 'mut_uji_31', tanggal: '2026-08-10', dicatatPada: '2026-09-10T09:00:00+07:00' })
    })
    const sesudah = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).data
    expect(sesudah.mutasi).toBe(awal.mutasi + 2)
    expect(sesudah.mutasiTepat).toBe(awal.mutasiTepat + 1)
  })
  it('permohonan online menaikkan digital.mandiri', () => {
    const awal = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).digital
    ubahDb((db) => {
      const contoh = db.permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG)!
      db.permohonan.push({ ...structuredClone(contoh), id: 'mhn_uji_online', kanal: 'online', masukPada: '2026-09-12T08:00:00+07:00' })
    })
    const sesudah = ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).digital
    expect(sesudah).toEqual({ masuk: awal.masuk + 1, mandiri: awal.mandiri + 1 })
  })
  it('kabar terbit 299 karakter tidak membuat minggu aktif, 300 karakter membuat aktif', () => {
    ubahDb((db) => {
      db.artikel = db.artikel.filter((a) => a.desaId !== ID_SUNGAI_SIALANG)
      db.pengumuman = db.pengumuman.filter((p) => p.desaId !== ID_SUNGAI_SIALANG)
    })
    const tulis = (panjang: number) =>
      ubahDb((db) => {
        db.artikel = db.artikel.filter((a) => a.id !== 'art_uji')
        const contoh = structuredClone(db.artikel[0] ?? null)
        db.artikel.push({
          ...(contoh ?? { desaId: ID_SUNGAI_SIALANG, judul: 'Kabar uji', slug: 'kabar-uji', kategori: 'Kegiatan', penulis: 'Operator', dibaca: 0, ringkasan: 'Uji', foto: null }),
          id: 'art_uji',
          desaId: ID_SUNGAI_SIALANG,
          status: 'terbit',
          tanggal: '2026-09-08T09:00:00+07:00',
          isi: ['x'.repeat(panjang)],
        } as never)
      })
    tulis(299)
    expect(ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).website.mingguAktif).toBe(0)
    tulis(300)
    expect(ukuranBulanPanel(ambilDb(), desaSialang(), '2026-09', SEKARANG_UJI).website.mingguAktif).toBe(1)
  })
})

describe('pembekuan hasil final', () => {
  it('baris Sungai Sialang 2024-01 sampai 2026-08 sudah beku, bulan berjalan belum', () => {
    const bulan = ambilDb().ukuranIndeks.filter((u) => u.desaId === ID_SUNGAI_SIALANG).map((u) => u.bulan)
    expect(bulan[0]).toBe('2024-01')
    expect(bulan.at(-1)).toBe('2026-08')
    expect(bulan).toHaveLength(32)
  })
  it('mengubah data lama tidak mengubah Agustus, hanya klasemen sementara September', () => {
    const db = ambilDb()
    const agustusSebelum = hasilDesaPeriode(db, desaSialang(), AGUSTUS, SEKARANG_UJI)
    const septemberSebelum = hasilDesaPeriode(db, desaSialang(), SEPTEMBER, SEKARANG_UJI)
    ubahDb((d) => {
      const surat = d.permohonan.find((p) => p.desaId === ID_SUNGAI_SIALANG && p.status === 'selesai' && p.terbit?.pada.startsWith('2026-08'))!
      surat.terbit!.pada = '2026-09-20T09:00:00+07:00'
      for (const p of d.penduduk.filter((x) => x.desaId === ID_SUNGAI_SIALANG)) {
        p.pendidikan ??= 'SLTA/Sederajat'
        p.pekerjaan ??= 'Wiraswasta'
        p.statusPerkawinan ??= 'Kawin Tercatat'
      }
    })
    expect(hasilDesaPeriode(ambilDb(), desaSialang(), AGUSTUS, SEKARANG_UJI)).toEqual(agustusSebelum)
    const septemberSesudah = hasilDesaPeriode(ambilDb(), desaSialang(), SEPTEMBER, SEKARANG_UJI)
    expect(septemberSesudah).not.toEqual(septemberSebelum)
  })
  it('bulan yang tutup dibekukan tepat sekali, panggilan kedua tidak menulis', () => {
    const depan = new Date('2026-10-02T03:00:00Z')
    const jumlah = () => ambilDb().ukuranIndeks.filter((u) => u.desaId === ID_SUNGAI_SIALANG && u.bulan === '2026-09').length
    expect(jumlah()).toBe(0)
    bekukanBulanTutup(depan)
    expect(jumlah()).toBe(1)
    const total = ambilDb().ukuranIndeks.length
    bekukanBulanTutup(depan)
    expect(ambilDb().ukuranIndeks).toHaveLength(total)
    expect(jumlah()).toBe(1)
  })
  it('barisUkuran melewati bulan sebelum periode paling awal dan bulan depan', () => {
    const baris = barisUkuran(ambilDb(), desaSialang(), ['2023-12', '2024-01', '2026-09', '2026-10'], SEKARANG_UJI)
    expect(baris.map((b) => b.bulan)).toEqual(['2024-01', '2026-09'])
  })
})

describe('peserta', () => {
  it('desa yang mulai berlangganan 15 Juli bukan peserta Juli dan Triwulan III, tetapi peserta Agustus', () => {
    ubahDb((db) => {
      db.langganan.find((l) => l.desaId === ID_SUNGAI_SIALANG)!.mulai = '2026-07-15'
    })
    const db = ambilDb()
    const baris = ['2026-07', '2026-08', '2026-09'].map((b) => ukuranBulanPanel(db, desaSialang(), b, SEKARANG_UJI))
    expect(baris.map((b) => b.aktif)).toEqual([false, true, true])
    expect(hitungHasilDesa(baris, null, T3).peserta).toBe(false)
    expect(hitungHasilDesa([baris[1]], null, AGUSTUS).peserta).toBe(true)
  })
  it('desa Uji coba tidak pernah ikut', () => {
    const db = ambilDb()
    for (const desa of db.desa.filter((d) => d.status === 'Uji coba')) {
      const langganan = db.langganan.find((l) => l.desaId === desa.id)
      expect(aktifSepanjang(desa, langganan, '2026-08-01', '2026-08-31'), desa.nama).toBe(false)
      expect(db.ukuranIndeks.filter((u) => u.desaId === desa.id).every((u) => !u.aktif)).toBe(true)
    }
  })
})

describe('papan dan provinsi', () => {
  it('papan Pelalawan hanya berisi desa Pelalawan, berurutan, dan semua desa terhitung', () => {
    const db = ambilDb()
    const papan = papanKabupaten(db, '14.05', { musim: 'bulanan', periode: AGUSTUS, kategori: 'umum', kecamatan: null }, SEKARANG_UJI)
    const pelalawan = new Set(desaDiKabupaten(db, '14.05').map((d) => d.id))
    for (const b of papan.peringkat) expect(pelalawan.has(b.desa.id)).toBe(true)
    for (const b of papan.belumMemenuhi) expect(pelalawan.has(b.desa.id)).toBe(true)
    expect(papan.peringkat.length + papan.belumMemenuhi.length + papan.tidakIkut).toBe(pelalawan.size)
    expect(papan.peringkat.map((b) => b.ukuran)).toEqual([...papan.peringkat.map((b) => b.ukuran)].sort((a, b) => b - a))
    expect(papan.peringkat.every((b) => b.tingkatan !== null && b.skor === null)).toBe(true)
    expect(papan.podiumKecamatan).toBeNull()
    expect(papan.periode).toMatchObject({ kode: '2026-08', label: 'Agustus 2026', berjalan: false, tutupPada: '2026-09-01T00:00:00+07:00' })
  })
  it('Layanan Tercepat diurutkan dari jam terkecil', () => {
    const papan = papanKabupaten(ambilDb(), '14.05', { musim: 'bulanan', periode: AGUSTUS, kategori: 'layanan', kecamatan: null }, SEKARANG_UJI)
    const jam = papan.peringkat.map((b) => b.ukuran)
    expect(jam.length).toBeGreaterThan(5)
    expect(jam).toEqual([...jam].sort((a, b) => a - b))
  })
  it('papan kecamatan 14.05.09: Sungai Sialang, Kuala Rengas, dan Teluk Pauh', () => {
    const papan = papanKabupaten(ambilDb(), '14.05', { musim: 'bulanan', periode: AGUSTUS, kategori: 'umum', kecamatan: '14.05.09' }, SEKARANG_UJI)
    const nama = [...papan.peringkat.map((b) => b.desa.nama), ...papan.belumMemenuhi.map((b) => b.desa.nama)].sort()
    expect(papan.kecamatan?.kode).toBe('14.05.09')
    expect(nama.length + papan.tidakIkut).toBe(3)
    expect(papan.podiumKecamatan).toBe(papan.peringkat.length >= 3)
  })
  it('periode berjalan ditandai klasemen sementara', () => {
    const papan = papanKabupaten(ambilDb(), '14.05', { musim: 'bulanan', periode: SEPTEMBER, kategori: 'umum', kecamatan: null }, SEKARANG_UJI)
    expect(papan.periode.berjalan).toBe(true)
  })
  it('peringkat provinsi mencakup lima kabupaten; Kuantan Singingi belum punya nilai; Paling Merata Pelalawan', () => {
    const db = ambilDb()
    const hasil = peringkatProvinsi(db, '14', AGUSTUS, SEKARANG_UJI)
    expect(hasil.map((h) => h.kabupaten.nama).sort()).toEqual(['Indragiri Hilir', 'Kampar', 'Kuantan Singingi', 'Pelalawan', 'Siak'])
    expect(hasil.find((h) => h.kabupaten.kode === '14.09')!.umum).toBeNull()
    const bergabung = desaDiKabupaten(db, '14.05').filter((d) => (d.status === 'Aktif' || d.status === 'Uji coba') && bergabungPada(db, d, '2026-08-31')).length
    expect(hasil.find((h) => h.kabupaten.kode === '14.05')!.merata).toBe(bulat1((bergabung / 104) * 100))
    for (const h of hasil.filter((x) => x.desaBerIndeks >= 3)) expect(h.umum).not.toBeNull()
  })
  it('podium Laporan: sembilan kategori, peringkat sampai 3', () => {
    const podium = podiumKabupaten(ambilDb(), '14.05', AGUSTUS, SEKARANG_UJI)
    expect(podium).toHaveLength(9)
    for (const k of podium) expect(k.juara.every((j) => j.peringkat <= 3)).toBe(true)
    expect(bulanPeriode(AGUSTUS)).toEqual(['2026-08'])
  })
})
