import { describe, expect, it } from 'vitest'
import { aturTokenSesi } from '@/api/client'
import { papanIndeksSchema, type PapanIndeks } from '@/domain/indeks/schema'
import { ambilDb } from '@/mocks/db'
import { AKUN_KABUPATEN_UJI, pakaiApiTiruan } from '@/test/api-tiruan'

pakaiApiTiruan()

/** Semua endpoint baca dasbor kabupaten 7B-1, 7B-2, dan 7B-3. */
const ENDPOINT = ['/kabupaten/sesi', '/kabupaten/ringkasan', '/kabupaten/pemantauan', '/kabupaten/pengguna', '/kabupaten/dana-desa', '/kabupaten/tenggat', '/kabupaten/data-gabungan', '/kabupaten/peta', '/kabupaten/laporan', '/kabupaten/laporan/2026-08', '/kabupaten/siaran', '/kabupaten/siaran/sasaran', '/kabupaten/indeks', '/kabupaten/indeks?kategori=layanan&musim=triwulan']
/** Kunci yang bukan hak kabupaten (SPEC-V0.2 §5.1). */
const TERLARANG = ['nik', 'nomorKk', 'tagihan', 'riwayatStatus', 'nominal', 'kodeUnik', 'paket', 'penyimpananKb', 'alamatKantor', 'kataSandi']

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
  it('papan Indeks (7C-1): Siak tanpa desa Pelalawan, kecamatan lain 422, dan se-provinsi hanya podium serta posisi sendiri', async () => {
    const pelalawan = ambilDb().desa.filter((d) => d.kabupaten.kode === '14.05')
    const papan = (await ambilSebagai(AKUN_KABUPATEN_UJI.adminSiak, '/kabupaten/indeks')) as PapanIndeks
    const idPelalawan = new Set(pelalawan.map((d) => d.id))
    for (const b of [...papan.peringkat, ...papan.belumMemenuhi]) expect(idPelalawan.has(b.desa.id)).toBe(false)
    expect(papan.daftarKecamatan.every((k) => k.kode.startsWith('14.08.'))).toBe(true)
    aturTokenSesi(`kab.${AKUN_KABUPATEN_UJI.adminSiak}`, 'kabupaten')
    const respons = await fetch('http://localhost:3000/api/v1/kabupaten/indeks?kecamatan=14.05.09', {
      headers: { Authorization: `Bearer kab.${AKUN_KABUPATEN_UJI.adminSiak}` },
    })
    expect(respons.status).toBe(422)
    expect(((await respons.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ kecamatan: 'Pilih kecamatan di kabupaten ini.' })
    expect(papanIndeksSchema.parse(papan)).toEqual(papan)
    for (const k of papan.provinsi.kategori) {
      for (const p of k.podium) {
        expect(Object.keys(p).sort()).toEqual(['bersama', 'kabupaten', 'nilai', 'peringkat'])
        expect(p.peringkat).toBeLessThanOrEqual(3)
      }
    }
    expect(Object.keys(papan.provinsi).sort()).toEqual(['kategori', 'provinsi'])
  })
  it('detail per kabupaten (7B-2): tenggat sendiri tanpa kunci terlarang, dan Siak tanpa desa Pelalawan', async () => {
    const pelalawan = ambilDb().desa.filter((d) => d.kabupaten.kode === '14.05').map((d) => d.nama)
    const detail = [[AKUN_KABUPATEN_UJI.admin, '/kabupaten/tenggat/tgt_pll_dd2'], [AKUN_KABUPATEN_UJI.adminSiak, '/kabupaten/tenggat/tgt_siak_dd2']] as const
    for (const [id, jalur] of detail) {
      const isi = await ambilSebagai(id, jalur)
      const kunci = kunciDalam(isi)
      for (const t of [...TERLARANG, 'oleh', 'olehNama']) expect(kunci.has(t), `${id} ${jalur}: ${t}`).toBe(false)
      if (id === AKUN_KABUPATEN_UJI.adminSiak) for (const nama of pelalawan) expect(JSON.stringify(isi).includes(`"${nama}"`), nama).toBe(false)
    }
  })
  it('detail siaran (7B-3): baris desa hanya status, waktu, dan catatan; Siak tanpa desa Pelalawan', async () => {
    const pelalawan = ambilDb().desa.filter((d) => d.kabupaten.kode === '14.05').map((d) => d.nama)
    const detail = [[AKUN_KABUPATEN_UJI.admin, '/kabupaten/siaran/srn_pll_rakor'], [AKUN_KABUPATEN_UJI.adminSiak, '/kabupaten/siaran/srn_siak_rakor']] as const
    for (const [id, jalur] of detail) {
      const isi = (await ambilSebagai(id, jalur)) as { desa: object[] }
      for (const t of TERLARANG) expect(kunciDalam(isi).has(t), `${id} ${jalur}: ${t}`).toBe(false)
      for (const baris of isi.desa) expect(Object.keys(baris).sort()).toEqual(['dibacaPada', 'id', 'kecamatan', 'nama', 'status', 'tindakLanjut'])
      if (id === AKUN_KABUPATEN_UJI.adminSiak) for (const nama of pelalawan) expect(JSON.stringify(isi).includes(`"${nama}"`), nama).toBe(false)
    }
  })
})
