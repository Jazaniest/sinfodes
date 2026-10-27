import { describe, expect, it } from 'vitest'
import { BAGIAN_KONTRAK, VARIABEL_KONTRAK, VERSI_KONTRAK_TEMA } from './kontrak-tema'
import { susunPromptAi } from './prompt-ai'
import { TEMA_WARTA_BAWAAN, variabelTema } from './tema'

const kontrak = { versi: VERSI_KONTRAK_TEMA, variabel: VARIABEL_KONTRAK, bagian: BAGIAN_KONTRAK }
const tema = TEMA_WARTA_BAWAAN('#1F4E79')

describe('susunPromptAi (7G keputusan 10)', () => {
  it('prompt CSS memuat nama desa, setiap variabel kontrak beserta nilainya, dan semua larangan keputusan 1', () => {
    const prompt = susunPromptAi({
      jenis: 'css',
      namaDesa: 'Sungai Sialang',
      tema,
      kontrak,
      permintaan: 'Buat kartu kabar lebih terang.',
    })
    expect(prompt).toContain('Sungai Sialang')
    expect(prompt).toContain(VERSI_KONTRAK_TEMA)
    const nilai = variabelTema(tema)
    for (const nama of VARIABEL_KONTRAK) {
      expect(prompt).toContain(`${nama}: ${nilai[nama]}`)
    }
    expect(prompt).toContain(BAGIAN_KONTRAK.join(', '))
    for (const larangan of [
      '@import',
      'url()',
      'data:image/png',
      '/demo/foto/',
      '@font-face',
      'local()',
      'expression(',
      'behavior',
      '-moz-binding',
      'javascript:',
      'karakter \\',
      'desa-',
      '@namespace',
      '@page',
      '50 KB',
      'diurai',
    ]) {
      expect(prompt).toContain(larangan)
    }
    expect(prompt).toContain('320 px')
    expect(prompt).toContain('kontras')
    expect(prompt).toContain('Jawab dengan satu blok kode saja, tanpa penjelasan.')
    expect(prompt).toContain('Buat kartu kabar lebih terang.')
  })

  it('prompt HTML memuat CSP bingkai keputusan 5 dan batas ukuran kode', () => {
    const prompt = susunPromptAi({
      jenis: 'html',
      namaDesa: 'Sungai Sialang',
      tema,
      kontrak,
      permintaan: 'Buat peta lokasi kantor.',
    })
    expect(prompt).toContain('Sungai Sialang')
    expect(prompt).toContain("default-src 'none'; img-src data: ")
    expect(prompt).toContain('script-src')
    expect(prompt).toContain('64 KB')
    expect(prompt).toContain('320 px')
    expect(prompt).toContain('Jawab dengan satu blok kode saja, tanpa penjelasan.')
    expect(prompt).toContain('Buat peta lokasi kantor.')
  })
})
