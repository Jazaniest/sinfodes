import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { opsiBeranda } from '@/api/beranda'
import { aturModeJaringan } from '@/mocks/jaringan'
import { AKUN_DESA_BARU_UJI, AKUN_UJI, masukSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi, contohSesiDesaBaru } from '@/test/sesi'
import { Beranda } from './Beranda'

pakaiApiTiruan()

describe('Beranda (SPEC §5.3)', () => {
  it('operator: sapaan, perlu ditindaklanjuti, buku hari ini, keadaan desa', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(screen.getByRole('heading', { level: 1, name: 'Selamat pagi, Rosmiati' })).toBeInTheDocument()
    expect(screen.getByText(/Kamis, 24 September 2026/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '12 penduduk datanya belum lengkap' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk?preset=data-belum-lengkap',
    )
    const buku = screen.getByRole('region', { name: 'Buku hari ini' })
    expect(within(buku).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    expect(within(buku).getAllByText(/Kelahiran dicatat/).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText(
        /^2\.812 jiwa dalam 806 KK · bulan ini 3 lahir, 1 meninggal, 2 datang, 4 pindah · \d+ surat terbit dalam 30 hari terakhir, rata-rata selesai /,
      ),
    ).toBeInTheDocument()
  })
  it('Kepala Dusun II: tanpa tindakan dan buku hari ini; keadaan dusunnya', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kadus'))
    expect(await screen.findByRole('heading', { name: 'Keadaan Dusun II Sialang Jaya' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Perlu ditindaklanjuti' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Buku hari ini' })).not.toBeInTheDocument()
  })
  it('galat jaringan → pesan dan Coba lagi', async () => {
    masukSebagai(AKUN_UJI.operator)
    aturModeJaringan('gagal')
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(await screen.findByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
  it('operator: laporan warga di Perlu ditindaklanjuti (2A-3)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi())
    expect(await screen.findByRole('link', { name: '1 kelahiran dilaporkan warga, belum dicatat' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/mutasi/lahir?laporan=lap_kelahiran_rosnani',
    )
    expect(screen.getByRole('link', { name: '1 laporan perbaikan data dari warga' })).toHaveAttribute(
      'href',
      '/admin/kependudukan/penduduk/pdk_syahrial',
    )
  })
  it('butir surat di Buku hari ini membuka ruang kerja surat (2B-1)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    const buku = await screen.findByRole('region', { name: 'Buku hari ini' })
    const tautan = await within(buku).findAllByRole('link', { name: /^Permohonan / })
    expect(tautan[0]).toHaveAttribute('href', expect.stringMatching(/^\/admin\/surat\/srt_/))
  })
  it('Kepala Desa: menunggu tanda tangan Anda, dengan Mulai tanda tangani (2B-2)', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    const bagian = await screen.findByRole('region', { name: 'Menunggu tanda tangan Anda (2)' })
    expect(within(bagian).getByRole('link', { name: 'Mulai tanda tangani' })).toHaveAttribute('href', '/admin/surat/tanda-tangan')
  })
  it('Sekretaris Desa: perlu paraf Anda di bagian paling atas (2B-2)', async () => {
    masukSebagai(AKUN_UJI.sekdes)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('sekdes'))
    const bagian = await screen.findByRole('region', { name: 'Perlu paraf Anda (1)' })
    expect(screen.getAllByRole('region')[0]).toBe(bagian)
    expect(within(bagian).getByRole('link', { name: 'Lihat surat yang perlu diparaf' })).toHaveAttribute(
      'href',
      '/admin/surat?status=perlu-ttd',
    )
  })
  it('operator: permohonan menunggu di butir pertama, tanpa bagian tanda tangan (2B-2)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    const tindakan = await screen.findByRole('region', { name: 'Perlu ditindaklanjuti' })
    expect(within(tindakan).getAllByRole('link')[0]).toHaveAccessibleName('7 permohonan surat menunggu (tertua 2 hari kerja)')
    expect(within(tindakan).getByRole('link', { name: '1 surat dikembalikan untuk diperbaiki (SKU · Zulkifli)' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/admin\/surat\/srt_/),
    )
    expect(screen.queryByRole('region', { name: /tanda tangan Anda|paraf Anda/ })).not.toBeInTheDocument()
  })
  it('operator: pengaduan belum dibalas, dan butir pengaduan di Buku hari ini membuka pengaduannya (3A)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(await screen.findByRole('link', { name: '2 pengaduan belum dibalas' })).toHaveAttribute('href', '/admin/pengaduan')
    const buku = screen.getByRole('region', { name: 'Buku hari ini' })
    expect(within(buku).getByRole('link', { name: /^Pengaduan masuk · Lampu jalan mati/ }).getAttribute('href')).toMatch(
      /^\/admin\/pengaduan\/adu_/,
    )
  })
  it('Kepala Desa: pengaduan terbaru (3A)', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    const bagian = await screen.findByRole('region', { name: 'Pengaduan terbaru' })
    expect(within(bagian).getAllByRole('listitem')).toHaveLength(5)
    expect(within(bagian).getAllByRole('link')[0].getAttribute('href')).toMatch(/^\/admin\/pengaduan\/adu_/)
  })
  it('Kepala Dusun II: pengaduan dari dusunnya dan jadwal posyandu dusunnya (3A)', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kadus'))
    expect(await screen.findByRole('region', { name: 'Pengaduan dari Dusun II Sialang Jaya' })).toBeInTheDocument()
    const posyandu = screen.getByRole('region', { name: 'Jadwal posyandu' })
    expect(posyandu).toHaveTextContent('Posyandu Mawar · Rabu, 14 Oktober 2026')
  })
  it('operator: satu MiniBar realisasi belanja APBDes di keadaan desa (3B)', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    const meter = await screen.findByRole('meter', { name: 'Realisasi belanja APBDes 2026' })
    expect(meter.getAttribute('aria-valuetext')).toMatch(/^6[1-5],\d%$/)
    expect(screen.getByRole('link', { name: 'Lihat APBDes' })).toHaveAttribute('href', '/admin/keuangan')
  })
  it('Kepala Desa: realisasi APBDes per bidang dan pembangunan yang sedang berjalan (3B)', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    const apbdes = await screen.findByRole('region', { name: 'Realisasi APBDes 2026 per bidang' })
    expect(within(apbdes).getAllByRole('meter')).toHaveLength(5)
    const berjalan = screen.getByRole('region', { name: 'Pembangunan yang sedang berjalan' })
    expect(within(berjalan).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Semenisasi jalan lingkungan Dusun III', 'Sumur bor air bersih Dusun IV', 'Titian kayu penghubung Dusun II-IV',
    ])
    expect(within(berjalan).getAllByRole('meter', { name: 'Progres fisik' })[0]).toHaveAttribute('aria-valuetext', '70,0%')
  })
  it('Kaur Keuangan: pendapatan, belanja, per bidang, dan progres keuangan kegiatan (3B)', async () => {
    masukSebagai(AKUN_UJI.kaurKeuangan)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kaur-keuangan'))
    const apbdes = await screen.findByRole('region', { name: 'Realisasi APBDes 2026' })
    expect(within(apbdes).getByRole('meter', { name: 'Pendapatan' })).toBeInTheDocument()
    expect(within(apbdes).getAllByRole('meter')).toHaveLength(7)
    const keuangan = screen.getByRole('region', { name: 'Progres keuangan kegiatan pembangunan' })
    expect(within(keuangan).getAllByRole('meter', { name: 'Progres keuangan' })[0]).toHaveAttribute('aria-valuetext', '62,0%')
  })
})

describe('Beranda desa berstatus Persiapan (SPEC §5.3)', () => {
  it('Operator Tanjung Lamo: daftar persiapan 0 dari 5 menggantikan isi Beranda biasa', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesiDesaBaru())
    expect(screen.getByRole('heading', { level: 1, name: 'Selamat pagi, Yusri' })).toBeInTheDocument()
    expect(await screen.findByText('0 dari 5 langkah selesai')).toBeInTheDocument()
    const langkah = within(screen.getByRole('list', { name: 'Langkah persiapan' })).getAllByRole('listitem')
    expect(langkah.map((l) => within(l).queryByRole('link')?.getAttribute('href') ?? null)).toEqual([
      '/admin/pengaturan',
      '/admin/pengaturan/wilayah',
      '/admin/kependudukan/penduduk/impor',
      null,
      '/admin/surat/jenis',
    ])
    expect(screen.getByRole('link', { name: 'Lanjutkan: Isi identitas dan kop surat' })).toHaveAttribute('href', '/admin/pengaturan')
    expect(screen.queryByRole('heading', { name: 'Keadaan desa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Buku hari ini' })).not.toBeInTheDocument()
  })
  it('langkah yang tidak boleh dibuka Operator bukan tautan mati: "Dikerjakan Sekretaris Desa" (fokus review 5)', async () => {
    masukSebagai(AKUN_DESA_BARU_UJI)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesiDesaBaru())
    const langkah = within(await screen.findByRole('list', { name: 'Langkah persiapan' })).getAllByRole('listitem')
    expect(langkah[3]).toHaveTextContent('Tambah pengguna')
    expect(langkah[3]).toHaveTextContent('Dikerjakan Sekretaris Desa')
    expect(langkah[3]).toHaveTextContent('Desa yang belum punya Sekretaris Desa meminta Tim Sinfodes mengundangnya.')
    expect(within(langkah[3]).queryByRole('link')).not.toBeInTheDocument()
    expect(within(langkah[3]).queryByRole('button')).not.toBeInTheDocument()
  })
  it('desa Aktif tetap memakai Beranda biasa, tanpa daftar persiapan', async () => {
    masukSebagai(AKUN_UJI.operator)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('operator'))
    expect(await screen.findByRole('heading', { name: 'Keadaan desa' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Persiapan desa' })).not.toBeInTheDocument()
  })
  it('Beranda selalu dimuat ulang saat dibuka: progres persiapan langsung segar (fokus review 5)', () => {
    expect(opsiBeranda().staleTime).toBe(0)
  })
})

describe('Beranda: pengingat tenggat laporan (SPEC-V0.2 §8.3 butir 4)', () => {
  it('pengingat tenggat laporan ke kabupaten untuk pemegang keuangan.lihat (SPEC-V0.2 §8.3 butir 4)', async () => {
    masukSebagai(AKUN_UJI.kades)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kades'))
    const kotak = await screen.findByRole('region', { name: 'Tenggat laporan ke Kabupaten Pelalawan' })
    const tautan = within(kotak).getByRole('link', { name: 'Laporan realisasi Dana Desa tahap II 2026 · 30 September 2026 · 6 hari lagi' })
    expect(tautan).toHaveAttribute('href', '/admin/keuangan#laporan-kabupaten')
  })
  it('Kepala Dusun tidak mendapat pengingat tenggat', async () => {
    masukSebagai(AKUN_UJI.kadus)
    renderPanel(<Beranda sekarang={SEKARANG_UJI} />, contohSesi('kadus'))
    await screen.findByRole('heading', { name: 'Keadaan Dusun II Sialang Jaya' })
    expect(screen.queryByRole('region', { name: /Tenggat laporan/ })).not.toBeInTheDocument()
  })
})
