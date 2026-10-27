// Unduh foto demo hasil kurasi (SPEC §9, K8) dari Wikimedia Commons ke public/demo/foto/, lalu tulis KREDIT.md.
// Jalankan sekali dari akar proyek: node scripts/unduh-foto-demo.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { LEBAR_FOTO } from '../src/domain/website/foto.ts'
import { FOTO_DEMO, halamanCommons } from '../src/mocks/data/foto-demo.ts'

const TUJUAN = new URL('../public/demo/foto/', import.meta.url)
const AGEN = 'SinfodesDemo/1.0 (unduh foto demo berlisensi bebas)'
const jeda = (ms) => new Promise((selesai) => setTimeout(selesai, ms))

/** Wikimedia menyajikan versi web lewat Special:FilePath?width=…; permintaan yang terlalu rapat dijawab 429. */
async function unduh(judul, lebar, nama) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(judul)}?width=${lebar}`
  for (let coba = 1; coba <= 3; coba++) {
    const respons = await fetch(url, { headers: { 'User-Agent': AGEN } })
    if (respons.ok) {
      await writeFile(new URL(nama, TUJUAN), Buffer.from(await respons.arrayBuffer()))
      return
    }
    if (respons.status !== 429 || coba === 3) throw new Error(`${nama}: HTTP ${respons.status}`)
    await jeda(10_000 * coba)
  }
}

await mkdir(TUJUAN, { recursive: true })
for (const f of FOTO_DEMO) {
  await unduh(f.judulCommons, LEBAR_FOTO.besar, `${f.berkas}.jpg`)
  await jeda(1500)
  await unduh(f.judulCommons, LEBAR_FOTO.kecil, `${f.berkas}-${LEBAR_FOTO.kecil}.jpg`)
  await jeda(1500)
  console.log(`selesai: ${f.berkas}`)
}

const baris = FOTO_DEMO.map(
  (f) => `| ${f.berkas}.jpg | [${f.judulCommons}](${halamanCommons(f.judulCommons)}) | ${f.pembuat} | [${f.lisensi}](${f.tautanLisensi}) |`,
)
await writeFile(
  new URL('KREDIT.md', TUJUAN),
  [
    '# Kredit foto demo',
    '',
    'Semua foto diambil dari Wikimedia Commons dengan lisensi bebas, lalu dipakai dalam ukuran web 1280px dan 960px.',
    'Tidak ada foto buatan AI (SPEC §9, K8). Foto kantor desa dan kegiatan warga dipakai sebagai ilustrasi desa demo fiktif.',
    '',
    '| Berkas | Judul asli | Pembuat | Lisensi |',
    '|---|---|---|---|',
    ...baris,
    '',
  ].join('\n'),
)
console.log(`${FOTO_DEMO.length} foto dan KREDIT.md tersimpan di public/demo/foto/`)
