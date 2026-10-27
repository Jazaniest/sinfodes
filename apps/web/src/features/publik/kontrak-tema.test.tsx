import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { JENIS_BLOK, susunBlok, type Blok } from '@/domain/website/blok'
import { BAGIAN_KONTRAK, VARIABEL_KONTRAK, VERSI_KONTRAK_TEMA } from '@/domain/website/kontrak-tema'
import { ubahDb } from '@/mocks/db'
import { pakaiApiTiruan } from '@/test/api-tiruan'
import { renderRute } from '@/test/render'

pakaiApiTiruan({ dbSegarTiapUji: true })

const DESA = 'desa_sungai_sialang'
const KODE_HTML = 'html_kontrak'

/** Susunan beranda berisi satu blok tiap jenis, dengan isian minimal supaya bloknya tampil di website terbit. */
function susunanSemuaJenis(): Blok[] {
  return JENIS_BLOK.map((jenis, i) => {
    const id = `blk_kontrak${i}`
    if (jenis === 'html') return susunBlok({ id, jenis, isi: { htmlId: KODE_HTML } })
    if (jenis === 'video') return susunBlok({ id, jenis, isi: { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', judul: 'Video desa' } })
    if (jenis === 'angka') return susunBlok({ id, jenis, varian: 'kalimat' })
    return susunBlok({ id, jenis })
  })
}

/** Tingkat Lanjut aktif dengan satu kode HTML, lalu beranda berisi semua jenis blok (7G). */
function siapkanSitus() {
  ubahDb((d) => {
    const situs = d.situs.find((s) => s.desaId === DESA)
    if (!situs) throw new Error('Situs demo Sungai Sialang tidak ada.')
    situs.lanjut = { aktif: true, pertamaDiaktifkan: situs.lanjut.pertamaDiaktifkan ?? '2026-01-05T08:00:00+07:00' }
    situs.terbit.blokHtml = [{ id: KODE_HTML, nama: 'Kode kontrak', kode: '<p>Kontrak tema</p>', tinggi: { mode: 'otomatis' } }]
    situs.terbit.susunan.beranda = susunanSemuaJenis()
  })
}

/** Tanda satu halaman selesai dimuat, termasuk blok yang datanya diambil terpisah. */
const HALAMAN = [
  { alamat: '/desa/sungaisialang', tunggu: () => screen.findByRole('group', { name: 'Blok HTML' }) },
  { alamat: '/desa/sungaisialang/kabar', tunggu: () => screen.findByRole('heading', { level: 1, name: 'Kabar desa' }) },
  { alamat: '/desa/sungaisialang/verifikasi', tunggu: () => screen.findByRole('contentinfo') },
] as const

/** Render beranda, Kabar, dan Cek keaslian bergantian; kumpulkan semua nilai `data-bagian` yang tampil. */
async function kumpulkanBagian(): Promise<Set<string>> {
  const semua = new Set<string>()
  for (const h of HALAMAN) {
    const { container, unmount } = renderRute(h.alamat)
    await h.tunggu()
    for (const el of container.querySelectorAll('[data-bagian]')) semua.add(el.getAttribute('data-bagian') ?? '')
    unmount()
  }
  return semua
}

describe('Kontrak tema v1 di website publik (7G Tugas 6)', () => {
  it('VERSI_KONTRAK_TEMA tetap "kontrak-tema v1"', () => {
    expect(VERSI_KONTRAK_TEMA).toBe('kontrak-tema v1')
  })

  it('setiap variabel kontrak terpasang di wadah dengan nilai tidak kosong', async () => {
    siapkanSitus()
    const { container, unmount } = renderRute('/desa/sungaisialang')
    await screen.findByRole('group', { name: 'Blok HTML' })
    const wadah = container.querySelector<HTMLElement>('[data-situs]')!
    expect(wadah, 'Wadah website ([data-situs]) tidak ada').not.toBeNull()
    for (const nama of VARIABEL_KONTRAK) {
      expect(wadah.style.getPropertyValue(nama).trim(), `Variabel kontrak "${nama}" tidak terpasang di wadah`).not.toBe('')
    }
    unmount()
  })

  it('setiap nama bagian kontrak ada di salah satu halaman yang dirender', async () => {
    siapkanSitus()
    const semua = await kumpulkanBagian()
    for (const bagian of BAGIAN_KONTRAK) {
      expect(semua.has(bagian), `Bagian kontrak "${bagian}" tidak ditemukan`).toBe(true)
    }
  })
})
