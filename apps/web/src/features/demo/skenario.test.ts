import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { ID_SUNGAI_SIALANG, PENGGUNA_DEMO } from '@sinfodes/demo/data/desa-demo'
import { PENGGUNA_KONSOL_DEMO } from '@sinfodes/demo/data/desa-konsol'
import { PENGGUNA_KABUPATEN_DEMO } from '@sinfodes/demo/data/kabupaten-demo'
import { AKUN_WARGA_DEMO } from '@sinfodes/demo/data/warga-demo'
import { masukkanJalur } from '@/app/rewrite-alamat'
import type { KonteksAlamat, TujuanAlamat } from '@/domain/alamat/alamat'
import { routeTree } from '@/routeTree.gen'
import { SKENARIO_DEMO, tautanSkenario, type MasukSkenario } from './skenario'

const semuaTombol = SKENARIO_DEMO.flatMap((s) => s.langkah.flatMap((l) => l.tombol))

/** Tujuan tautan sebagai konteks alamat yang membukanya, untuk memetakan jalurnya ke rute internal. */
const konteksDari = (t: TujuanAlamat): KonteksAlamat => t
const akunUji = {
  admin: PENGGUNA_DEMO.filter((p) => p.desaId === ID_SUNGAI_SIALANG),
  konsol: PENGGUNA_KONSOL_DEMO,
}

function akunAda(m: MasukSkenario): boolean {
  switch (m.bagian) {
    case 'admin':
      return PENGGUNA_DEMO.some((p) => p.desaId === ID_SUNGAI_SIALANG && p.peran === m.peran && p.aktif)
    case 'warga':
      return AKUN_WARGA_DEMO.some((a) => a.pendudukId === m.pendudukId)
    case 'konsol':
      return PENGGUNA_KONSOL_DEMO.some((p) => p.peran === m.peran)
    case 'kabupaten':
      return PENGGUNA_KABUPATEN_DEMO.some((p) => p.id === m.id && p.aktif)
    case 'publik':
      return true
  }
}

describe('skenario terpandu (SPEC §3.6, §13.5)', () => {
  it('tujuh skenario terpandu berurutan; Akses bantuan 3 langkah (SPEC-V0.2 §13, rencana Penutup v0.2 keputusan 2)', () => {
    expect(SKENARIO_DEMO.map((s) => [s.judul, s.langkah.length])).toEqual([
      ['SKTM dari HP sampai verifikasi QR', 5],
      ['Mencatat kelahiran', 3],
      ['Pemantauan kabupaten', 2],
      ['Siaran kabupaten', 3],
      ['Tagihan langganan', 3],
      ['Ganti tema website', 2],
      ['Akses bantuan Sinfodes', 3],
    ])
    expect(SKENARIO_DEMO.every((s) => s.langkah.every((l) => l.tombol.length > 0))).toBe(true)
  })
  it('setiap tombol menuju rute yang ada (fokus review 5)', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } })
    for (const t of semuaTombol) {
      const jalur = masukkanJalur(konteksDari(t.tujuan), new URL(t.jalur, 'http://demo.test').pathname)
      const [, , ditemukan] = router.getMatchedRoutes(jalur)
      expect(ditemukan, `${t.tujuan.jenis} ${t.jalur}`).toBeDefined()
    }
  })
  it('Sekdes memaraf dari daftar surat Perlu TTD (tombol Paraf ada di sana), bukan dari tumpukan tanda tangan', () => {
    const paraf = semuaTombol.find((t) => t.masuk.bagian === 'admin' && t.masuk.peran === 'sekdes')
    expect(paraf?.tujuan).toEqual({ jenis: 'desa', label: 'sungaisialang' })
    expect(paraf?.jalur).toBe('/admin/surat?status=perlu-ttd')
  })
  it('tombol membuka alamat yang benar dengan masuk cepat (SPEC-V0.2 §4.6)', () => {
    const kades = semuaTombol.find((t) => t.masuk.bagian === 'admin' && t.masuk.peran === 'kades')
    expect(kades && tautanSkenario(kades, akunUji)).toBe('http://sungaisialang.sinfodes.localhost:3000/admin/surat/tanda-tangan?demo=pgn_nasir')
    const cek = semuaTombol.find((t) => t.masuk.bagian === 'publik')
    expect(cek && tautanSkenario(cek, akunUji)).toBe('http://sungaisialang.sinfodes.localhost:3000/verifikasi')
  })
  it('pemantauan kabupaten dibuka Peninjau Pelalawan di dasbor kabupaten (SPEC-V0.2 §8.3)', () => {
    const langkah1 = SKENARIO_DEMO.find((s) => s.id === 'pemantauan')?.langkah[0]?.tombol[0]
    expect(langkah1 && tautanSkenario(langkah1, akunUji)).toBe('http://kab-pelalawan.sinfodes.localhost:3000/admin/pemantauan?demo=kab_rosnani')
  })
  it('skenario Tagihan: Kaur Keuangan ke Langganan, Dina ke Tagihan Konsol, lalu Kaur Keuangan lagi (rencana 7D-2 keputusan 11)', () => {
    const tagihan = SKENARIO_DEMO.find((s) => s.id === 'tagihan')
    expect(tagihan?.ringkas).toBe('Desa mengunggah bukti transfer, Tim Sinfodes memverifikasi, lalu kwitansi terbit.')
    const tombol = tagihan!.langkah.map((l) => l.tombol[0])
    expect(tombol.map((t) => tautanSkenario(t, akunUji))).toEqual([
      'http://sungaisialang.sinfodes.localhost:3000/admin/pengaturan/langganan?demo=pgn_nurhayati',
      'http://konsol.sinfodes.localhost:3000/konsol/tagihan?demo=kns_dina',
      'http://sungaisialang.sinfodes.localhost:3000/admin/pengaturan/langganan?demo=pgn_nurhayati',
    ])
  })
  it('skenario Ganti tema: Operator ke Tampilan, lalu website Sungai Sialang tanpa masuk (rencana 7E-2 keputusan 11)', () => {
    const tema = SKENARIO_DEMO.find((s) => s.id === 'ganti-tema')
    expect(tema?.ringkas).toBe('Operator memasang tema dari galeri, lalu melihat website desa berubah.')
    expect(tema?.langkah.map((l) => l.teks)).toEqual(['Pilih tema di galeri', 'Lihat hasilnya di website'])
    const tombol = tema!.langkah.map((l) => l.tombol[0])
    expect(tombol.map((t) => tautanSkenario(t, akunUji))).toEqual([
      'http://sungaisialang.sinfodes.localhost:3000/admin/website/tampilan?demo=pgn_rosmiati',
      'http://sungaisialang.sinfodes.localhost:3000/',
    ])
  })
  it('skenario Akses bantuan: Sekdes beri akses, Dina masuk dari tab Keaktifan Detail desa, Sekdes lihat jejak (rencana Penutup v0.2 keputusan 1)', () => {
    const akses = SKENARIO_DEMO.find((s) => s.id === 'akses-bantuan')
    expect(akses?.ringkas).toBe('Sekretaris Desa memberi akses sementara, Tim Sinfodes masuk dengan data pribadi tersamar, lalu desa melihat jejaknya.')
    expect(akses?.langkah.map((l) => l.teks)).toEqual(['Beri akses sementara', 'Masuk sebagai bantuan', 'Lihat halaman yang dibuka'])
    const tombol = akses!.langkah.map((l) => l.tombol[0])
    expect(tombol.map((t) => tautanSkenario(t, akunUji))).toEqual([
      'http://sungaisialang.sinfodes.localhost:3000/admin/pengaturan/akses-sinfodes?demo=pgn_hendri',
      'http://konsol.sinfodes.localhost:3000/konsol/desa/desa_sungai_sialang?tab=keaktifan&demo=kns_dina',
      'http://sungaisialang.sinfodes.localhost:3000/admin/pengaturan/akses-sinfodes?demo=pgn_hendri',
    ])
  })
  it('setiap tombol memakai akun yang ada di data demo (fokus review 5)', () => {
    for (const t of semuaTombol) expect(akunAda(t.masuk), `${t.label} → ${JSON.stringify(t.masuk)}`).toBe(true)
  })
})
