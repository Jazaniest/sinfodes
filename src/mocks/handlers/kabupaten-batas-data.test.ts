import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { ambilDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

/** Semua endpoint baca dasbor kabupaten 7B-1. Endpoint baru di 7B-2 dan 7B-3 ditambahkan di sini. */
const ENDPOINT = ['/kabupaten/sesi', '/kabupaten/ringkasan', '/kabupaten/pemantauan', '/kabupaten/pengguna']
/** Kunci yang bukan hak kabupaten (SPEC-V0.2 §5.1). */
const TERLARANG = ['nik', 'nomorKk', 'tagihan', 'paket', 'penyimpananKb', 'alamatKantor', 'kataSandi']

function kunciDalam(nilai: unknown, kumpul = new Set<string>()): Set<string> {
  if (Array.isArray(nilai)) for (const x of nilai) kunciDalam(x, kumpul)
  else if (nilai !== null && typeof nilai === 'object') {
    for (const [k, v] of Object.entries(nilai)) {
      kumpul.add(k)
      kunciDalam(v, kumpul)
    }
  }
  return kumpul
}

async function ambilSebagai(id: string, jalur: string): Promise<unknown> {
  aturTokenSesi(`kab.${id}`, 'kabupaten')
  const r = await fetch(`http://localhost:3000/api/v1${jalur}`, { headers: { Authorization: `Bearer kab.${id}` } })
  expect(r.status, jalur).toBe(200)
  return r.json()
}

describe('batas data kabupaten (SPEC-V0.2 §5.1, fokus review 1 dan 5)', () => {
  it('tidak ada kunci yang bukan hak kabupaten di respons mana pun', async () => {
    for (const id of [AKUN_KABUPATEN_UJI.admin, AKUN_KABUPATEN_UJI.adminSiak]) {
      for (const jalur of ENDPOINT) {
        const kunci = kunciDalam(await ambilSebagai(id, jalur))
        for (const t of TERLARANG) expect(kunci.has(t), `${id} ${jalur}: ${t}`).toBe(false)
      }
    }
  })
  it('Admin Siak tidak pernah menerima desa Pelalawan', async () => {
    const pelalawan = ambilDb().desa.filter((d) => d.kabupaten.kode === '14.05').map((d) => d.nama)
    for (const jalur of ENDPOINT) {
      const teks = JSON.stringify(await ambilSebagai(AKUN_KABUPATEN_UJI.adminSiak, jalur))
      for (const nama of pelalawan) expect(teks.includes(`"${nama}"`), `${jalur}: ${nama}`).toBe(false)
    }
  })
})
