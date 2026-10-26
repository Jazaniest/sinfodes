import { describe, expect, it } from 'vitest'
import { JENIS_SURAT_BAWAAN } from './bawaan'
import { jenisSuratSchema, PENANDA_TABEL, SISIPAN_UMUM, sisipanDalamTeks } from './jenis'

const kode = (syarat: (j: (typeof JENIS_SURAT_BAWAAN)[number]) => boolean) => JENIS_SURAT_BAWAAN.filter(syarat).map((j) => j.kode)

describe('jenis surat bawaan (SPEC §7.3)', () => {
  it('12 jenis sesuai urutan SPEC, semuanya lolos skema', () => {
    expect(JENIS_SURAT_BAWAAN.map((j) => j.kode)).toEqual([
      'SKD', 'SKTM', 'SKU', 'SPCK', 'SKL', 'SKM', 'SPP', 'SKP', 'SPN', 'SKBN', 'SKBM', 'SKH',
    ])
    for (const j of JENIS_SURAT_BAWAAN) {
      const lengkap = { ...j, id: `js_ss_${j.kode.toLowerCase()}`, desaId: 'desa_sungai_sialang', asal: 'bawaan', diarsipkan: null }
      expect(jenisSuratSchema.parse(lengkap)).toEqual(lengkap)
    }
  })
  it('klasifikasi, penandatangan, paraf, masa berlaku, dan layanan online sesuai SPEC', () => {
    expect(JENIS_SURAT_BAWAAN.map((j) => j.klasifikasi)).toEqual([
      '470', '400', '500', '300', '474.1', '474.3', '475', '400', '474.2', '470', '474.2', '300',
    ])
    expect(kode((j) => j.bolehAtasNama)).toEqual(['SKD', 'SPCK', 'SKH'])
    expect(kode((j) => j.wajibParaf)).toEqual(['SKTM', 'SKP', 'SPN'])
    expect(kode((j) => !j.online)).toEqual(['SKM', 'SPP', 'SPN'])
    expect(kode((j) => j.masaBerlakuBulan === null)).toEqual(['SKL', 'SKM', 'SKBN'])
    expect(JENIS_SURAT_BAWAAN.find((j) => j.kode === 'SKU')?.masaBerlakuBulan).toBe(6)
    expect(kode((j) => j.subjek !== 'pemohon')).toEqual(['SKL', 'SKM'])
  })
  it('setiap sisipan di teks dikenal; [tabelRincian] ada tepat bila ada isian bertanda tabel', () => {
    const umum = SISIPAN_UMUM.map((s) => s.kunci)
    for (const j of JENIS_SURAT_BAWAAN) {
      const dikenal = new Set<string>([...umum, PENANDA_TABEL, ...j.isian.map((i) => i.kunci)])
      const sisipan = sisipanDalamTeks(j.teks)
      expect(sisipan.filter((s) => !dikenal.has(s)), j.kode).toEqual([])
      expect(sisipan.includes(PENANDA_TABEL), j.kode).toBe(j.isian.some((i) => i.diTabel))
      expect(sisipan.includes('berlakuSampai'), j.kode).toBe(j.masaBerlakuBulan !== null)
    }
  })
})
