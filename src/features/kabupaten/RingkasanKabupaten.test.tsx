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
