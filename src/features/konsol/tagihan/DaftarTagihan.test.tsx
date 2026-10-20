import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { formatAngka } from '@/domain/format/angka'
import type { TabTagihan } from '@/domain/langganan/tagihan'
import { ambilDb } from '@/mocks/db'
import { AKUN_KONSOL_UJI, masukKonsolSebagai, pakaiApiTiruan, SEKARANG_UJI } from '@/test/api-tiruan'
import { renderKonsol } from '@/test/render'
import { DaftarTagihan } from './DaftarTagihan'

pakaiApiTiruan({ dbSegarTiapUji: true })

function pasang(tab?: TabTagihan) {
  masukKonsolSebagai(AKUN_KONSOL_UJI.tim)
  const onBukaTagihan = vi.fn()
  renderKonsol(<DaftarTagihan tab={tab} onBukaTagihan={onBukaTagihan} sekarang={SEKARANG_UJI} />)
  return { onBukaTagihan, user: userEvent.setup() }
}
const baris = async () => within(await screen.findByRole('grid', { name: 'Daftar tagihan' })).getAllByRole('row').slice(1)

describe('Daftar Tagihan Konsol (rencana 7D-2 Tugas 3)', () => {
  it('tanpa tab: Menunggu verifikasi dengan 2 baris; kolom, angka di tab, dan baris membuka detail', async () => {
    const { onBukaTagihan, user } = pasang()
    expect(await screen.findByRole('heading', { level: 1, name: 'Tagihan' })).toBeInTheDocument()
    const tabel = await screen.findByRole('grid', { name: 'Daftar tagihan' })
    expect(within(within(tabel).getAllByRole('row')[0]).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Desa', 'Nomor', 'Periode', 'Nominal', 'Jatuh tempo', 'Status',
    ])
    const isi = await baris()
    expect(isi).toHaveLength(2)
    expect(isi.every((r) => r.textContent?.includes('Menunggu verifikasi'))).toBe(true)
    const tab = screen.getByRole('navigation', { name: 'Status tagihan' })
    expect(within(tab).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Menunggu verifikasi2', 'Belum dibayar' + formatAngka(ambilDb().tagihan.filter((t) => t.status === 'terbit' && t.jatuhTempo >= '2026-09-24').length),
      'Lewat jatuh tempo1', 'Lunas' + formatAngka(ambilDb().tagihan.filter((t) => t.status === 'lunas').length), 'Semua' + formatAngka(ambilDb().tagihan.length),
    ])
    expect(within(tab).getByRole('link', { name: /^Lewat jatuh tempo/ })).toHaveAttribute('href', '/konsol/tagihan?tab=lewat')
    expect(within(tab).getByRole('link', { name: /^Menunggu verifikasi/ })).toHaveAttribute('aria-current', 'page')
    await user.click(isi[0])
    expect(onBukaTagihan).toHaveBeenCalledWith(ambilDb().tagihan.filter((t) => t.status === 'menunggu-verifikasi').sort((a, b) => a.bukti!.diunggahPada.localeCompare(b.bukti!.diunggahPada) || a.id.localeCompare(b.id))[0].id)
  })
  it('tab Lewat jatuh tempo berisi Sungai Rambai', async () => {
    pasang('lewat')
    const isi = await baris()
    expect(isi).toHaveLength(1)
    expect(isi[0]).toHaveTextContent('Sungai Rambai')
    expect(isi[0]).toHaveTextContent('Lewat jatuh tempo')
  })
  it('cari nominal dengan titik: satu baris lintas tab; kata kunci tidak masuk alamat halaman', async () => {
    const { user } = pasang('lunas')
    const t = ambilDb().tagihan.find((x) => x.status === 'menunggu-verifikasi')!
    await baris()
    await user.type(screen.getByRole('searchbox', { name: 'Cari nominal, nomor, atau desa' }), formatAngka(t.nominal))
    const hasil = await screen.findByRole('grid', { name: 'Hasil pencarian' })
    expect(within(hasil).getAllByRole('row').slice(1)).toHaveLength(1)
    expect(within(hasil).getAllByRole('row')[1]).toHaveTextContent(t.nomor)
    expect(window.location.search).not.toContain('q=')
    expect(window.location.search).not.toContain(String(t.nominal))
  })
  it('cari nama desa dalam tab aktif, dan pesan bila tidak ada yang cocok', async () => {
    const { user } = pasang('lewat')
    await baris()
    const kotak = screen.getByRole('searchbox', { name: 'Cari nominal, nomor, atau desa' })
    await user.type(kotak, 'rambai')
    expect(await within(await screen.findByRole('grid', { name: 'Hasil pencarian' })).findByText('Sungai Rambai')).toBeInTheDocument()
    await user.clear(kotak)
    await user.type(kotak, 'zzzz')
    expect(await screen.findByText('Tidak ada tagihan yang cocok dengan “zzzz”.')).toBeInTheDocument()
  })
})
