import { screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { AKUN_UJI, masukSebagai, pakaiApiTiruan } from '@/test/api-tiruan'
import { renderPanel } from '@/test/render'
import { contohSesi } from '@/test/sesi'
import { DaftarAgenda } from './DaftarAgenda'
import { DaftarArtikel } from './DaftarArtikel'
import { DaftarPengumuman } from './DaftarPengumuman'
import { Galeri } from './Galeri'

pakaiApiTiruan()

function pasang(ui: ReactElement) {
  masukSebagai(AKUN_UJI.operator)
  return renderPanel(ui, contohSesi('operator'))
}
const barisDi = async (nama: string) => within(await screen.findByRole('grid', { name: nama })).getAllByRole('row').slice(1)

describe('Website Desa (SPEC §8)', () => {
  it('artikel: judul, kategori, status Draf/Terbit, penulis, tanggal, dan dibaca; tab Artikel aktif', async () => {
    pasang(<DaftarArtikel />)
    const baris = await barisDi('Artikel')
    expect(baris).toHaveLength(12)
    expect(baris[0]).toHaveTextContent('Hasil Musrenbangdes: 5 Usulan Prioritas untuk 2027')
    expect(baris[0]).toHaveTextContent('Draf')
    const menumbai = baris.find((b) => b.textContent?.includes('Tradisi Menumbai'))
    expect(menumbai).toHaveTextContent('Terbit')
    expect(menumbai).toHaveTextContent('Budaya')
    expect(menumbai).toHaveTextContent('2.051')
    expect(screen.getByText('12 artikel · 10 terbit, 2 draf')).toBeInTheDocument()
    const tab = screen.getByRole('navigation', { name: 'Bagian website desa' })
    expect(within(tab).getByRole('link', { name: 'Artikel' })).toHaveAttribute('aria-current', 'page')
    expect(within(tab).getAllByRole('link').map((a) => a.textContent)).toEqual(['Artikel', 'Pengumuman', 'Agenda', 'Galeri', 'Tampilan', 'Lencana'])
  })
  it('pengumuman: masa berlaku dan statusnya, terbaru dulu', async () => {
    pasang(<DaftarPengumuman />)
    const baris = await barisDi('Pengumuman')
    expect(baris).toHaveLength(4)
    expect(baris[0]).toHaveTextContent('Penyaluran BLT Dana Desa Tahap III')
    expect(baris[0]).toHaveTextContent('Berlaku')
    expect(baris[3]).toHaveTextContent('Berakhir')
  })
  it('agenda: yang terdekat dulu, dengan hari, jam, dan tempat', async () => {
    pasang(<DaftarAgenda />)
    const baris = await barisDi('Agenda')
    expect(baris).toHaveLength(5)
    expect(baris[0]).toHaveTextContent('Gotong Royong Parit RT 006-007')
    expect(baris[0]).toHaveTextContent('Senin, 28 September 2026')
    expect(baris[0]).toHaveTextContent('07.30-10.00 WIB')
    expect(baris.find((b) => b.textContent?.includes('Rapat Pleno BPD'))).toHaveTextContent('14.00 WIB sampai selesai')
  })
  it('galeri: 15 foto kurasi per album, masing-masing dengan judulnya', async () => {
    pasang(<Galeri />)
    expect(await screen.findByRole('heading', { name: 'Potensi desa' })).toBeInTheDocument()
    expect(screen.getAllByRole('figure')).toHaveLength(15)
    expect(screen.queryByText('Belum ada foto')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ombak Bono di Teluk Meranti' })).toHaveAttribute('src', '/demo/foto/ombak-bono.jpg')
  })
})
