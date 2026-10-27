import { describe, expect, it } from 'vitest'
import { normalkanJalur, periksaCss, type MasalahCss } from './css-kustom'

const POLA_MEDIA = /^\/demo\/foto\/[a-z0-9-]+\.jpg$/i
const periksa = (css: string) => periksaCss(css, { polaMedia: POLA_MEDIA })
const pesan = (daftar: readonly MasalahCss[]) => daftar.map((m) => m.pesan)
const terlingkupRapi = (hasil: { terlingkup: string | null }) => hasil.terlingkup?.replace(/\s+/g, ' ').trim() ?? null

describe('pemeriksa CSS kustom (rencana 7G Tugas 1)', () => {
  it('setiap pesan penolakan muncul dengan nomor baris yang benar', async () => {
    const css = [
      'a { background: url(https://x/y.jpg); }',
      'b { width: expression(0); }',
      '',
      '@import "b.css";',
      '@keyframes geser { from { opacity: 0 } }',
      '@namespace "urn:x";',
      '@page { margin: 1cm }',
    ].join('\n')
    const hasil = await periksa(css)
    expect(hasil.terlingkup).toBeNull()
    expect(hasil.masalah).toContainEqual({ baris: 1, pesan: 'Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.' })
    expect(hasil.masalah).toContainEqual({ baris: 2, pesan: 'Baris 2: "expression(" tidak diizinkan.' })
    expect(hasil.masalah).toContainEqual({ baris: 4, pesan: 'Baris 4: @import tidak diizinkan.' })
    expect(hasil.masalah).toContainEqual({ baris: 5, pesan: 'Baris 5: nama @keyframes harus diawali desa-.' })
    expect(hasil.masalah).toContainEqual({ baris: 6, pesan: 'Baris 6: @namespace tidak diizinkan.' })
    expect(hasil.masalah).toContainEqual({ baris: 7, pesan: 'Baris 7: @page tidak diizinkan.' })
  })

  it('@font-face dengan sumber luar ditolak pesan khusus, local() dan huruf data diizinkan', async () => {
    const luar = await periksa('@font-face {\n  font-family: "X";\n  src: url(https://fonts.example/x.woff2);\n}')
    expect(luar.masalah).toEqual([{ baris: 3, pesan: 'Baris 3: @font-face hanya boleh memakai huruf data atau local().' }])
    expect(luar.terlingkup).toBeNull()
    const sah = await periksa('@font-face {\n  font-family: "X";\n  src: local("Arial"), url(data:font/woff2;base64,AAA);\n}')
    expect(sah.masalah).toEqual([])
    expect(sah.terlingkup).not.toBeNull()
  })

  it('pesan parser menyebut barisnya', async () => {
    const hasil = await periksa('.a { color: red; }\n}')
    expect(hasil.terlingkup).toBeNull()
    expect(hasil.masalah.length).toBeGreaterThan(0)
    for (const m of hasil.masalah) {
      expect(m.baris).toBe(2)
      expect(m.pesan).toMatch(/^Baris 2: .+\.$/)
    }
  })

  it('ukuran lebih dari 50 KB ditolak; tepat 50 KB masih lolos', async () => {
    const kebabihan = await periksa('x'.repeat(50 * 1024 + 1))
    expect(kebabihan.masalah).toEqual([{ baris: 1, pesan: 'CSS paling besar 50 KB.' }])
    expect(kebabihan.terlingkup).toBeNull()
    const isi = '.a{content:"' + 'x'.repeat(50 * 1024 - 14) + '"}'
    expect(new TextEncoder().encode(isi).length).toBe(50 * 1024)
    const pas = await periksa(isi)
    expect(pas.masalah).toEqual([])
    expect(pas.terlingkup).not.toBeNull()
  })

  it('urutan masalah menurut baris', async () => {
    const hasil = await periksa('@page { margin: 0 }\n@import "x";\n\nb { behavior: none; }')
    expect(pesan(hasil.masalah)).toEqual([
      'Baris 1: @page tidak diizinkan.',
      'Baris 2: @import tidak diizinkan.',
      'Baris 4: "behavior" tidak diizinkan.',
    ])
  })
})

describe('penyamaran larangan (fokus review 1)', () => {
  it('@IMPORT dan @import di dalam @media tetap ditolak', async () => {
    expect(pesan((await periksa('@IMPORT "b.css";')).masalah)).toContain('Baris 1: @import tidak diizinkan.')
    const dalamMedia = await periksa('@media print {\n  @import "x.css";\n}')
    expect(pesan(dalamMedia.masalah)).toContain('Baris 2: @import tidak diizinkan.')
    expect(dalamMedia.terlingkup).toBeNull()
  })

  it('escape u\\72l ditolak karena tanda \\', async () => {
    const hasil = await periksa('a { background: u\\72l(x.jpg); }')
    expect(pesan(hasil.masalah)).toContain('Baris 1: tanda \\ tidak diizinkan.')
    expect(hasil.terlingkup).toBeNull()
  })

  it('URL( "https://x" ) dengan spasi dan kutip tetap ditolak', async () => {
    const hasil = await periksa('a { background: URL( "https://x" ); }')
    expect(pesan(hasil.masalah)).toEqual(['Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.'])
  })

  it('url(//x), url(data:text/html) ditolak', async () => {
    expect(pesan((await periksa('a { background: url(//x); }')).masalah)).toEqual(['Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.'])
    expect(pesan((await periksa('a { background: url(data:text/html,<b>); }')).masalah)).toEqual(['Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.'])
  })

  it('jalur dinormalkan sebelum dicocokkan: url(/demo/foto/../../evil.jpg) ditolak', async () => {
    expect(normalkanJalur('/demo/foto/../../evil.jpg')).toBe('/evil.jpg')
    expect(normalkanJalur('/demo/foto/./x.jpg')).toBe('/demo/foto/x.jpg')
    expect(normalkanJalur('demo/../foto/x.jpg')).toBe('foto/x.jpg')
    const hasil = await periksa('a { background: url(/demo/foto/../../evil.jpg); }')
    expect(pesan(hasil.masalah)).toEqual(['Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.'])
  })

  it('url() pada properti kustom tetap diperiksa', async () => {
    const hasil = await periksa('a { --x: url(https://x/y); }')
    expect(pesan(hasil.masalah)).toEqual(['Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.'])
  })

  it('expression dalam komentar dibuang, boleh; url gambar data dan foto media desa diizinkan', async () => {
    const komentar = await periksa('/* expression( behavior \\ java\\script: */\n.kartu { color: red }')
    expect(komentar.masalah).toEqual([])
    expect(komentar.terlingkup).not.toBeNull()
    const izin = await periksa(
      [
        '.a { background: url(data:image/png;base64,AAA) }',
        '.b { background: url("/demo/foto/sampul-sungai-kampar.jpg") }',
        '.c { background: URL(DATA:IMAGE/JPEG;base64,BBB) }',
        '.d { background: url(data:image/svg+xml,<svg/>) }',
      ].join('\n'),
    )
    expect(izin.masalah).toEqual([])
  })

  it('java\\script: ditolak karena tanda \\, kata terlarang peka huruf besar-kecil', async () => {
    expect(pesan((await periksa('a { content: "java\\script:alert(1)"; }')).masalah)).toEqual(['Baris 1: tanda \\ tidak diizinkan.'])
    const peka = await periksa('a { width: EXPRESSION(0); }\nb { content: "JAVASCRIPT:x"; }')
    expect(pesan(peka.masalah)).toEqual(['Baris 1: "expression(" tidak diizinkan.', 'Baris 2: "javascript:" tidak diizinkan.'])
  })

  it.each([
    'a { background: image-set("https://evil.example/x.png" 1x); }',
    "a { background: -webkit-image-set('//evil.example/x.png' 1x, \"/demo/foto/../x.jpg\" 2x); }",
    'a { background-image: image("https://evil.example/x.png"); }',
    'a { background-image: src("https://evil.example/x.png"); }',
    'a { background-image: cross-fade("https://evil.example/x.png" 50%, url(data:image/png;base64,AAA)); }',
    'a { background: IMAGE-SET( "https://evil.example/x.png" 1x ); }',
    'a { --x: image-set(url(data:image/png;base64,AAA) 1x, "https://evil.example/y.png" 2x); }',
  ])('fungsi gambar bersumber string tidak boleh jadi jalan keluar url(): %s', async (css) => {
    const hasil = await periksa(css)
    // Satu pesan per string yang melanggar; pesannya sama.
    expect([...new Set(pesan(hasil.masalah))]).toEqual(['Baris 1: url() hanya boleh ke gambar data atau foto media desa ini.'])
    expect(hasil.terlingkup).toBeNull()
  })

  it('image-set() dan image() ke foto media desa atau gambar data tetap diizinkan, termasuk type()', async () => {
    const hasil = await periksa(
      [
        '.a { background: image-set("/demo/foto/sampul-sungai-kampar.jpg" 1x, "data:image/png;base64,AAA" 2x); }',
        '.b { background: image-set(url("/demo/foto/a.jpg") type("image/jpeg") 1x); }',
        '.c { background-image: image("/demo/foto/a.jpg", red); }',
        '.d { background-image: image-set("/demo/foto/a.jpg" type("image/jpeg")); }',
      ].join('\n'),
    )
    expect(hasil.masalah).toEqual([])
    expect(hasil.terlingkup).not.toBeNull()
  })

  it('scroll-behavior dan overscroll-behavior sah; "behavior" sebagai properti sendiri tetap ditolak', async () => {
    const sah = await periksa('html { scroll-behavior: smooth }\n.a { overscroll-behavior: contain; -ms-scroll-chaining: none }')
    expect(sah.masalah).toEqual([])
    for (const css of ['a{behavior:url(x.htc)}', 'a { color: red; behavior : none }', 'a {BEHAVIOR: none}', 'a{x:1;\nbehavior:none}']) {
      const hasil = await periksa(css)
      expect(pesan(hasil.masalah).some((p) => p.endsWith('"behavior" tidak diizinkan.')), css).toBe(true)
    }
  })

  it('keempat kata terlarang muncul dengan kutip dan barisnya', async () => {
    const hasil = await periksa(
      ['a { width: expression(0); }', 'b { behavior: none; }', 'c { -moz-binding: none; }', 'd { content: "javascript:x"; }'].join('\n'),
    )
    expect(pesan(hasil.masalah)).toEqual([
      'Baris 1: "expression(" tidak diizinkan.',
      'Baris 2: "behavior" tidak diizinkan.',
      'Baris 3: "-moz-binding" tidak diizinkan.',
      'Baris 4: "javascript:" tidak diizinkan.',
    ])
  })
})

describe('pengurungan ke lingkup website (fokus review 2)', () => {
  it('CSS sah dikurung persis', async () => {
    const hasil = await periksa('.kartu { color: var(--desa-warna-utama) }')
    expect(hasil.masalah).toEqual([])
    expect(hasil.terlingkup).toBe(':where([data-situs-kustom]) .kartu{color:var(--desa-warna-utama)}')
  })

  const kasus: readonly (readonly [string, string])[] = [
    ['html body .toast', ':where([data-situs-kustom]) .toast'],
    [':root', ':where([data-situs-kustom])'],
    ['*', ':where([data-situs-kustom]) *'],
    ['body > *', ':where([data-situs-kustom])>*'],
    ['[data-sinfodes-toolbar]', ':where([data-situs-kustom]) [data-sinfodes-toolbar]'],
    [':is(html) div', ':where([data-situs-kustom]) div'],
  ]
  for (const [selektor, harap] of kasus) {
    it(`selektor ${selektor} hanya mengenai wadah lingkup`, async () => {
      const hasil = await periksa(`${selektor} { color: red }`)
      expect(hasil.masalah).toEqual([])
      expect(hasil.terlingkup).toBe(`${harap}{color:red}`)
    })
  }

  it('tidak ada selektor yang dimulai html, body, atau :root', async () => {
    const hasil = await periksa('html body .toast, :root, body > *, [data-sinfodes-toolbar], :is(html) div, * { color: red }')
    const daftar = hasil.terlingkup!.slice(0, hasil.terlingkup!.indexOf('{')).split(',')
    expect(daftar).toHaveLength(6)
    for (const s of daftar) {
      expect(s.trim().startsWith(':where([data-situs-kustom])')).toBe(true)
      expect(s.trim()).not.toMatch(/^(html|body|:root)/)
    }
  })

  it('@media bersarang dan @supports ikut dikurung; @keyframes desa-geser dibiarkan', async () => {
    const hasil = await periksa(
      [
        '@keyframes desa-geser { from { opacity: 0 } to { opacity: 1 } }',
        '@media (min-width: 600px) {',
        '  @supports (display: grid) {',
        '    .x { color: red }',
        '  }',
        '}',
      ].join('\n'),
    )
    expect(hasil.masalah).toEqual([])
    expect(terlingkupRapi(hasil)).toBe(
      '@keyframes desa-geser{from{opacity:0}to{opacity:1}}@media (min-width:600px){@supports (display:grid){:where([data-situs-kustom]) .x{color:red}}}',
    )
  })

  it('CSS kosong lolos dengan terlingkup kosong', async () => {
    await expect(periksa('')).resolves.toEqual({ masalah: [], peringatan: [], terlingkup: '' })
  })
})

describe('peringatan kontras pada aturan lingkup akar (keputusan 3)', () => {
  it(':root { --desa-warna-utama: #FFD400 } → satu peringatan baris 1, tetap lolos', async () => {
    const hasil = await periksa(':root { --desa-warna-utama: #FFD400 }')
    expect(hasil.masalah).toEqual([])
    expect(hasil.terlingkup).not.toBeNull()
    expect(hasil.peringatan).toHaveLength(1)
    expect(hasil.peringatan[0].baris).toBe(1)
    expect(hasil.peringatan[0].pesan).toMatch(/^Baris 1: Kontras teks putih di atas warna utama .+ : 1; perlu paling sedikit 4,5 : 1\.$/)
  })

  it('tiga variabel diubah → tiga pemeriksaan; nilai aman → tanpa peringatan; bukan aturan akar → tanpa peringatan', async () => {
    const tiga = await periksa(':root {\n  --desa-warna-utama: #FFD400;\n  --desa-warna-aksen: #EEEEEE;\n  --desa-latar: #FFFFFF;\n}')
    expect(tiga.peringatan.map((m) => m.baris)).toEqual([2, 2, 3])
    const aman = await periksa(':root { --desa-warna-utama: #1F4E79 }')
    expect(aman.peringatan).toEqual([])
    const bukanAkhir = await periksa('.kartu { --desa-warna-utama: #FFD400 }')
    expect(bukanAkhir.peringatan).toEqual([])
  })
})
