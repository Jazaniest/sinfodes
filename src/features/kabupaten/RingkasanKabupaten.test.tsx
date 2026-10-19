import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
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
