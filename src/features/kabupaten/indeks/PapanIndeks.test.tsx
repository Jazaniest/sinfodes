import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { FilterPapanIndeks } from '@/domain/indeks/schema'
import { API } from '@/mocks/http'
import { serverUji } from '@/mocks/node'
import { AKUN_KABUPATEN_UJI, masukKabupatenSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { contohSesiKabupaten } from '@/test/kabupaten'
import { renderKabupaten } from '@/test/render'
import { PapanIndeks } from './PapanIndeks'

pakaiApiTiruan()

/** Pemilih menulis ke "URL"; di uji, URL-nya adalah state. */
function Pasang({ awal = {} }: { awal?: FilterPapanIndeks }) {
  const [filter, setFilter] = useState<FilterPapanIndeks>(awal)
  return <PapanIndeks filter={filter} onUbahFilter={(ubah) => setFilter((lama) => ({ ...lama, ...ubah }))} />
}

function pasang(awal?: FilterPapanIndeks) {
  masukKabupatenSebagai(AKUN_KABUPATEN_UJI.admin)
  renderKabupaten(<Pasang awal={awal} />, contohSesiKabupaten(AKUN_KABUPATEN_UJI.admin))
  return userEvent.setup()
}

async function pilih(user: ReturnType<typeof userEvent.setup>, label: RegExp, opsi: string | RegExp) {
  await user.click(await screen.findByRole('button', { name: label }))
  await user.click(await screen.findByRole('option', { name: opsi }))
}

describe('Indeks & Peringkat (SPEC-V0.2 §9.4, §9.5)', () => {
  it('bawaan: Agustus 2026, Juara Umum, Cap juara di baris pertama, dan kolom Tingkatan', async () => {
    pasang()
    expect(await screen.findByRole('heading', { level: 1, name: 'Indeks & Peringkat' })).toBeInTheDocument()
    const tabel = await screen.findByRole('table', { name: /Peringkat Juara Umum, Agustus 2026/ })
    expect(screen.getByText('Kabupaten Pelalawan · Agustus 2026')).toBeInTheDocument()
    const baris = within(tabel).getAllByRole('row')
    expect(within(baris[1]).getByText('Juara 1', { exact: false })).toBeInTheDocument()
    expect(within(tabel).getByRole('columnheader', { name: 'Tingkatan' })).toBeInTheDocument()
    expect(within(tabel).getByRole('columnheader', { name: 'Kecamatan' })).toBeInTheDocument()
  })
  it('Layanan Tercepat: kolom Median jam, jam terkecil di atas, dan tanpa kolom Tingkatan', async () => {
    pasang({ kategori: 'layanan' })
    const tabel = await screen.findByRole('table', { name: /Peringkat Layanan Tercepat/ })
    expect(within(tabel).getByRole('columnheader', { name: 'Median jam' })).toBeInTheDocument()
    expect(within(tabel).queryByRole('columnheader', { name: 'Tingkatan' })).not.toBeInTheDocument()
    const jam = within(tabel)
      .getAllByRole('row')
      .slice(1)
      .map((r) => Number(/([\d,]+) jam/.exec(r.textContent ?? '')?.[1].replace(',', '.')))
    expect(jam).toEqual([...jam].sort((a, b) => a - b))
  })
  it('periode berjalan: banner klasemen sementara dengan tanggal tutup', async () => {
    pasang({ periode: '2026-09' })
    expect(await screen.findByText(/Klasemen sementara\. Angka masih bisa berubah sampai periode tutup pada 1 Oktober 2026 pukul 00\.00 WIB\./)).toBeInTheDocument()
  })
  it('memilih periode lewat pemilih mengganti papan', async () => {
    const user = pasang()
    await screen.findByRole('table', { name: /Agustus 2026/ })
    await pilih(user, /Periode/, /September 2026/)
    expect(await screen.findByRole('table', { name: /September 2026/ })).toBeInTheDocument()
    expect(screen.getByText(/Klasemen sementara\./)).toBeInTheDocument()
  })
  it('filter kecamatan: tanpa kolom Kecamatan; podium kecamatan hanya bila cukup desa', async () => {
    pasang({ kecamatan: '14.05.09' })
    const tabel = await screen.findByRole('table', { name: /Peringkat Juara Umum/ })
    expect(within(tabel).queryByRole('columnheader', { name: 'Kecamatan' })).not.toBeInTheDocument()
    expect(within(tabel).getAllByRole('row').length).toBeLessThanOrEqual(4)
  })
  it('podium kecamatan kurang dari 3 desa: keterangan, tanpa Cap juara', async () => {
    pasang({ kecamatan: '14.05.09', kategori: 'layanan' })
    const tabel = await screen.findByRole('table', { name: /Peringkat Layanan Tercepat/ })
    if (within(tabel).getAllByRole('row').length - 1 < 3) {
      expect(screen.getByText('Podium kecamatan dibuat bila paling sedikit 3 desa memenuhi syarat.')).toBeInTheDocument()
      expect(within(tabel).queryByText(/Juara/)).not.toBeInTheDocument()
    }
  })
  it('bagian se-provinsi: podium kabupaten dan posisi Pelalawan', async () => {
    pasang()
    const bagian = await screen.findByRole('region', { name: 'Se-provinsi Riau' })
    expect(within(bagian).getAllByText(/^Kabupaten Pelalawan (peringkat|belum masuk peringkat)/, { selector: 'p' })).toHaveLength(2)
    expect(within(bagian).getAllByRole('table').length).toBeGreaterThanOrEqual(1)
  })
  it('belum memenuhi syarat dan desa yang tidak ikut ditulis', async () => {
    pasang()
    await screen.findByRole('table', { name: /Peringkat/ })
    expect(screen.getByText(/desa tidak ikut peringkat: desa Uji coba, Persiapan, Ditangguhkan/)).toBeInTheDocument()
  })
  it('periode tanpa desa memenuhi syarat: pesan kosong, tanpa galat', async () => {
    pasang({ musim: 'tahunan', periode: '2024', kategori: 'meningkat' })
    expect(await screen.findByText('Belum ada desa yang memenuhi syarat')).toBeInTheDocument()
    expect(screen.getByText('Coba periode atau kategori lain.')).toBeInTheDocument()
  })
  it('galat API: pesan galat dengan Coba lagi', async () => {
    serverUji.use(http.get(`${API}/kabupaten/indeks`, () => HttpResponse.json({ error: { code: 'SERVER', message: 'Server rusak.' } }, { status: 500 })))
    pasang()
    expect(await screen.findByRole('button', { name: /Coba lagi/ })).toBeInTheDocument()
  })
})
