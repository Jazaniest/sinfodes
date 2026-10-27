import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { API } from '@/mocks/http'
import { serverUji } from '@/mocks/node'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { RingkasanKabupaten } from './RingkasanKabupaten'

pakaiApiTiruan()

it('Ringkasan kabupaten: perlu perhatian dengan jalan ke Pemantauan, lalu adopsi dalam kalimat (SPEC-V0.2 §8.3)', async () => {
  masukKabupatenSebagai(AKUN_KABUPATEN_UJI.peninjau)
  renderKabupaten(<RingkasanKabupaten sekarang={SEKARANG_UJI} />, contohSesiKabupaten('kab_rosnani'))
  expect(screen.getByRole('heading', { level: 1, name: 'Ringkasan' })).toBeInTheDocument()
  expect(screen.getByText('Kabupaten Pelalawan · Kamis, 24 September 2026')).toBeInTheDocument()
  const perhatian = await screen.findByRole('region', { name: 'Perlu perhatian' })
  expect(perhatian).toHaveTextContent(/desa tidak aktif 14 hari/)
  expect(perhatian).toHaveTextContent(/desa berhenti di langkah persiapan/)
  expect(perhatian).not.toHaveTextContent(/tagihan/)
  expect(within(perhatian).getAllByRole('link', { name: 'Buka Pemantauan' })[0]).toHaveAttribute('href', '/kabupaten/admin/pemantauan')
  const adopsi = screen.getByRole('region', { name: 'Adopsi' })
  expect(adopsi).toHaveTextContent('25 dari 104 desa di Kabupaten Pelalawan sudah memakai Sinfodes.')
  expect(adopsi).toHaveTextContent('5 desa lain dalam persiapan dan 2 ditangguhkan.')
})

it('Ringkasan kabupaten: butir realisasi Dana Desa tertinggal menuju Dana Desa (SPEC-V0.2 §8.3 butir 1)', async () => {
  masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
  renderKabupaten(<RingkasanKabupaten sekarang={SEKARANG_UJI} />, contohSesiKabupaten('kab_fajar'))
  const perhatian = await screen.findByRole('region', { name: 'Perlu perhatian' })
  const butir = within(perhatian).getByText(/desa realisasi Dana Desa tertinggal/).closest('li')
  if (!butir) throw new Error('Butir Dana Desa tidak ada')
  expect(within(butir).getByRole('link', { name: 'Buka Dana Desa' })).toHaveAttribute('href', '/kabupaten/admin/dana-desa')
  expect(within(perhatian).getAllByRole('link', { name: 'Buka Pemantauan' })).toHaveLength(2)
  // Butir siaran (7B-3) menuju menu Siaran.
  const siaran = within(perhatian).getByText(/desa belum membaca siaran/).closest('li')
  if (!siaran) throw new Error('Butir siaran tidak ada')
  expect(within(siaran).getByRole('link', { name: 'Buka Siaran' })).toHaveAttribute('href', '/kabupaten/admin/siaran')
})

it('Ringkasan kabupaten: Indeks Desa Digital dengan rata-rata, empat tingkatan, dan tautan ke papan (7C-1)', async () => {
  masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
  renderKabupaten(<RingkasanKabupaten sekarang={SEKARANG_UJI} />, contohSesiKabupaten('kab_fajar'))
  const indeks = await screen.findByRole('region', { name: 'Indeks Desa Digital · Agustus 2026' })
  expect(indeks).toHaveTextContent(/Rata-rata Indeks \d+,\d/)
  const sebaran = within(indeks).getByRole('list', { name: 'Sebaran tingkatan' })
  expect(within(sebaran).getAllByRole('listitem').map((l) => l.textContent?.replace(/\s\(\d+\)$/, ''))).toEqual(['Rintisan', 'Berkembang', 'Maju', 'Mandiri Digital'])
  expect(indeks).toHaveTextContent(/Peringkat \d+ dari \d+ kabupaten di Riau|Belum masuk peringkat se-provinsi/)
  expect(within(indeks).getByRole('link', { name: 'Buka Indeks & Peringkat' })).toHaveAttribute('href', '/kabupaten/admin/indeks')
})

it('Ringkasan kabupaten: tanpa rata-rata tertulis Belum ada Indeks', async () => {
  serverUji.use(
    http.get(`${API}/kabupaten/ringkasan`, () =>
      HttpResponse.json({
        kabupaten: { kode: '14.05', nama: 'Pelalawan' },
        perhatian: [],
        adopsi: { bergabung: 3, jumlahDesa: 104, aktif: 3, ujiCoba: 0, persiapan: 0, ditangguhkan: 0 },
        indeks: { periode: { kode: '2026-08', label: 'Agustus 2026' }, rataRata: null, sebaran: { rintisan: 0, berkembang: 0, maju: 0, mandiri: 0 }, tanpaIndeks: 3, posisiProvinsi: null },
      }),
    ),
  )
  masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
  renderKabupaten(<RingkasanKabupaten sekarang={SEKARANG_UJI} />, contohSesiKabupaten('kab_fajar'))
  const indeks = await screen.findByRole('region', { name: 'Indeks Desa Digital · Agustus 2026' })
  expect(indeks).toHaveTextContent('Belum ada Indeks')
  expect(indeks).toHaveTextContent('3 desa bergabung belum ber-Indeks.')
  expect(indeks).toHaveTextContent('Belum masuk peringkat se-provinsi')
})
