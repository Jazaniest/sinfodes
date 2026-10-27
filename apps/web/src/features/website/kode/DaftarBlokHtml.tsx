import { useState } from 'react'
import type { BlokHtml } from '@/domain/website/blok'
import type { Susunan } from '@/domain/website/susunan'
import { NumberField } from '@/ui/isian/NumberField'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { Tombol } from '@/ui/tombol/Tombol'
import { tampilkanToast } from '@/ui/toast/antrean'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import { PenyuntingBlokHtml } from './PenyuntingBlokHtml'

/** Nama halaman yang memakai satu kode HTML: `Beranda` atau judul halaman tambahan. */
function halamanPemakai(susunan: Susunan, htmlId: string): string[] {
  const dipakai: string[] = []
  if (susunan.beranda.some((b) => b.jenis === 'html' && b.isi.htmlId === htmlId)) dipakai.push('Beranda')
  for (const halaman of susunan.halaman) {
    if (halaman.blok.some((b) => b.jenis === 'html' && b.isi.htmlId === htmlId)) dipakai.push(halaman.judul)
  }
  return dipakai
}

/** `html_` + 8 karakter acak, mengikuti pola ID blok susunan. */
function idKodeBaru(): string {
  const acak = new Uint8Array(8)
  crypto.getRandomValues(acak)
  return `html_${Array.from(acak, (n) => 'abcdefghijklmnopqrstuvwxyz0123456789'[n % 36]).join('')}`
}

/** Daftar Blok HTML (7G): tambah, ubah nama, ubah tinggi, dan hapus; kode disunting di `PenyuntingBlokHtml`. */
export function DaftarBlokHtml() {
  const { isi, ubah } = useDrafSitus()
  const [terpilih, setTerpilih] = useState<string | null>(null)
  if (!isi) return null

  const daftar = isi.blokHtml
  const aktif = daftar.find((b) => b.id === terpilih) ?? daftar[0] ?? null

  const ubahItem = (id: string, f: (b: BlokHtml) => BlokHtml) =>
    ubah((d) => ({ ...d, blokHtml: d.blokHtml.map((b) => (b.id === id ? f(b) : b)) }))

  const tambah = () => {
    const id = idKodeBaru()
    ubah((d) => ({
      ...d,
      blokHtml: [...d.blokHtml, { id, nama: `Blok ${d.blokHtml.length + 1}`, kode: '', tinggi: { mode: 'otomatis' } }],
    }))
    setTerpilih(id)
  }

  const hapus = (item: BlokHtml) => {
    const dipakai = halamanPemakai(isi.susunan, item.id)
    if (dipakai.length > 0) {
      tampilkanToast({ pesan: `Blok HTML ini masih dipakai di ${dipakai.join(', ')}.`, nada: 'galat' })
      return
    }
    ubah((d) => ({ ...d, blokHtml: d.blokHtml.filter((b) => b.id !== item.id) }))
    if (aktif?.id === item.id) setTerpilih(null)
  }

  return (
    <section aria-label="Blok HTML" className="flex flex-col gap-3 rounded-2 border border-garis p-4">
      <h3 className="text-judul font-semibold">Blok HTML</h3>
      <p className="text-teks-kecil text-tinta-2">
        Satu kode bisa dipakai di beberapa blok susunan lewat sub-tab Susunan. Paling banyak 10 kode.
      </p>
      {daftar.length === 0 ? (
        <p className="text-teks-kecil text-tinta-2">Belum ada Blok HTML.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {daftar.map((item) => (
            <li key={item.id} aria-label={item.nama} className="flex flex-col gap-2 rounded-1 border border-garis p-2">
              <div className="flex flex-wrap items-end gap-2">
                <TextField
                  label="Nama"
                  value={item.nama}
                  onChange={(nama) => ubahItem(item.id, (b) => ({ ...b, nama }))}
                  className="w-44"
                />
                <Select
                  label="Tinggi"
                  pilihan={[
                    { id: 'otomatis', label: 'Otomatis' },
                    { id: 'tetap', label: 'Tetap' },
                  ]}
                  nilai={item.tinggi.mode}
                  onUbah={(mode) =>
                    ubahItem(item.id, (b) => ({
                      ...b,
                      tinggi: mode === 'tetap' ? { mode: 'tetap', px: 300 } : { mode: 'otomatis' },
                    }))
                  }
                  className="w-36"
                />
                {item.tinggi.mode === 'tetap' && (
                  <NumberField
                    label="Tinggi"
                    satuan="px"
                    nilai={item.tinggi.px}
                    min={40}
                    maks={3000}
                    onUbah={(px) => {
                      if (px !== null) ubahItem(item.id, (b) => ({ ...b, tinggi: { mode: 'tetap', px } }))
                    }}
                    className="w-28"
                  />
                )}
                <Tombol
                  ukuran="kecil"
                  varian={aktif?.id === item.id ? 'utama' : 'sekunder'}
                  onPress={() => setTerpilih(item.id)}
                >
                  Sunting kode
                </Tombol>
                <Tombol ukuran="kecil" onPress={() => hapus(item)}>
                  Hapus
                </Tombol>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Tombol ukuran="kecil" onPress={tambah} isDisabled={daftar.length >= 10}>
        Tambah blok HTML
      </Tombol>
      {aktif && <PenyuntingBlokHtml key={aktif.id} id={aktif.id} />}
    </section>
  )
}
