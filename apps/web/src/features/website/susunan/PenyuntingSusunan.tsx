import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { blokBaru, type Blok, type JenisBlok } from '@/domain/website/blok'
import type { Susunan } from '@/domain/website/susunan'
import { cn } from '@/ui/cn'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import {
  aturTersembunyi, blokTerpilihSesudahHapus, daftarBlok, gandakanBlok, gantiBlok, hapusBlok, hapusHalaman, pindahBlok,
  tambahBlok, tambahHalaman, ubahHalaman,
} from './aksi-susunan'
import { DaftarBlok } from './DaftarBlok'
import { DialogHalaman } from './DialogHalaman'
import { DialogKatalogBlok } from './DialogKatalogBlok'
import { PanelBlok } from './PanelBlok'
import { PenyuntingMenu } from './PenyuntingMenu'
import { PratinjauSusunan } from './PratinjauSusunan'
import { usePratinjau } from './usePratinjau'

const rute = getRouteApi('/admin/_panel/website/tampilan')

/** Blok isian sendiri yang perlu konfirmasi sebelum dihapus bila sudah berisi (keputusan 2). */
function punyaIsi(b: Blok): boolean {
  switch (b.jenis) {
    case 'teks':
      return b.isi.judul.trim() !== '' || b.isi.paragraf.some((p) => p.trim() !== '') || b.isi.tautan !== null
    case 'sambutan':
      return b.isi.teks.trim() !== '' || b.isi.nama.trim() !== '' || b.isi.foto !== null
    case 'ajakan':
      return b.isi.judul.trim() !== '' || b.isi.tombol.trim() !== ''
    case 'video':
      return b.isi.url.trim() !== ''
    default:
      return false
  }
}

/** Penyunting susunan blok (SPEC-V0.2 11.4): pemilih halaman, daftar blok, panel pengaturan, dan pratinjau. */
export function PenyuntingSusunan() {
  const cari = rute.useSearch()
  const navigate = rute.useNavigate()
  const { isi, ubah, lanjut } = useDrafSitus()
  const halaman = cari.halaman
  const pratinjau = usePratinjau(isi, halaman)
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [dialogKatalog, setDialogKatalog] = useState(false)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Blok | null>(null)
  const [dialogHalaman, setDialogHalaman] = useState<{ mode: 'tambah' | 'ubah'; judul: string; nama: string } | null>(null)
  const [konfirmasiHapusHalaman, setKonfirmasiHapusHalaman] = useState<{ id: string; judul: string } | null>(null)

  const blok = isi ? daftarBlok(isi.susunan, halaman) : []
  // Pindah halaman mematikan pilihan blok; pola penyesuaian saat render seperti PemilihWarna.
  const [halamanTerakhir, setHalamanTerakhir] = useState(halaman)
  if (halaman !== halamanTerakhir) {
    setHalamanTerakhir(halaman)
    setTerpilih(null)
  }
  if (!isi) return null

  const ubahSusunan = (f: (s: Susunan) => Susunan) => ubah((i) => ({ ...i, susunan: f(i.susunan) }))
  const pilihHalaman = (tujuan: string) => navigate({ search: (l) => ({ ...l, halaman: tujuan }), replace: true })

  const kosong = new Set((pratinjau.data?.blok ?? []).flatMap((b) => (b.kosong ? [b.id] : [])))
  const blokTerpilih = blok.find((b) => b.id === terpilih) ?? null
  const halamanTerpilih = isi.susunan.halaman.find((h) => h.id === halaman) ?? null

  const hapus = (b: Blok) => {
    const sesudah = blokTerpilihSesudahHapus(blok, b.id)
    ubahSusunan((s) => hapusBlok(s, halaman, b.id))
    setTerpilih(sesudah)
    setKonfirmasiHapus(null)
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[20rem_minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <nav aria-label="Halaman yang disusun" className="flex flex-col gap-1">
          <p className="text-label font-medium text-tinta-2 uppercase">Halaman</p>
          {[{ id: 'beranda', judul: 'Beranda' }, ...(isi?.susunan.halaman ?? []).map((h) => ({ id: h.id, judul: h.judul })), { id: 'menu', judul: 'Menu website' }].map((h) => (
            <button
              key={h.id}
              type="button"
              aria-current={halaman === h.id ? 'true' : undefined}
              onClick={() => pilihHalaman(h.id)}
              className={cn(
                'rounded-1 border px-3 py-2 text-start text-teks outline-none',
                'data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
                halaman === h.id ? 'border-tinta bg-lembar font-medium' : 'border-transparent hover:bg-lembar',
              )}
            >
              {h.judul}
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          <Tombol ukuran="kecil" onPress={() => setDialogHalaman({ mode: 'tambah', judul: '', nama: '' })}>
            Tambah halaman
          </Tombol>
          {halamanTerpilih && (
            <>
              <Tombol ukuran="kecil" onPress={() => setDialogHalaman({ mode: 'ubah', judul: halamanTerpilih.judul, nama: halamanTerpilih.nama })}>
                Ubah halaman
              </Tombol>
              <Tombol ukuran="kecil" onPress={() => setKonfirmasiHapusHalaman({ id: halamanTerpilih.id, judul: halamanTerpilih.judul })}>
                Hapus halaman
              </Tombol>
            </>
          )}
        </div>
        {halaman === 'menu' ? (
          <PenyuntingMenu />
        ) : (
          <DaftarBlok
            blok={blok}
            kosong={kosong}
            terpilih={terpilih}
            onPilih={setTerpilih}
            onPindah={(id, ke) => ubahSusunan((s) => pindahBlok(s, halaman, id, ke))}
            onGandakan={(id) => ubahSusunan((s) => gandakanBlok(s, halaman, id))}
            onTersembunyi={(id, t) => ubahSusunan((s) => aturTersembunyi(s, halaman, id, t))}
            onHapus={(id) => {
              const b = blok.find((x) => x.id === id)
              if (!b) return
              if (punyaIsi(b)) setKonfirmasiHapus(b)
              else hapus(b)
            }}
            onTambah={() => setDialogKatalog(true)}
          />
        )}
      </div>

      <section aria-label="Pengaturan blok" className="flex min-w-0 flex-col gap-3 rounded-2 border border-garis p-4">
        {blokTerpilih ? (
          <PanelBlok blok={blokTerpilih} onUbah={(b) => ubahSusunan((s) => gantiBlok(s, halaman, b))} />
        ) : (
          <p className="text-teks-kecil text-tinta-2">Pilih blok untuk mengaturnya.</p>
        )}
      </section>

      <PratinjauSusunan blok={pratinjau.data?.blok ?? []} tema={isi.tema} onPilih={setTerpilih} />

      <DialogKatalogBlok
        isOpen={dialogKatalog}
        onOpenChange={setDialogKatalog}
        blokHtml={isi.blokHtml}
        lanjut={lanjut.aktif}
        onPilih={(jenis: JenisBlok, htmlId?: string) => {
          const hasil = isi ? tambahBlok(isi.susunan, halaman, terpilih, jenis) : null
          if (!hasil) return
          if (jenis === 'html' && htmlId) {
            // Blok `html` baru langsung menunjuk kode yang dipilih di katalog; `blokBaru('html', …)` pasti varian html.
            const baru = blokBaru('html', hasil.id) as Extract<Blok, { jenis: 'html' }>
            ubahSusunan(() => gantiBlok(hasil.susunan, halaman, { ...baru, isi: { htmlId } }))
          } else {
            ubahSusunan(() => hasil.susunan)
          }
          setTerpilih(hasil.id)
        }}
      />
      <ConfirmDialog
        isOpen={konfirmasiHapus !== null}
        onOpenChange={(buka) => {
          if (!buka) setKonfirmasiHapus(null)
        }}
        judul="Hapus blok?"
        labelSetuju="Hapus"
        bahaya
        onSetuju={() => {
          if (konfirmasiHapus) hapus(konfirmasiHapus)
        }}
      >
        <p>Isi blok ini akan hilang dari draf.</p>
      </ConfirmDialog>
      <DialogHalaman
        isOpen={dialogHalaman !== null}
        onOpenChange={(buka) => {
          if (!buka) setDialogHalaman(null)
        }}
        awal={dialogHalaman?.mode === 'ubah' ? { judul: dialogHalaman.judul, nama: dialogHalaman.nama } : null}
        onSimpan={(judul, nama) => {
          if (dialogHalaman?.mode === 'ubah' && halamanTerpilih) {
            const hasil = ubahHalaman(isi.susunan, halamanTerpilih.id, judul, nama)
            if ('galat' in hasil) return hasil.galat
            ubahSusunan(() => hasil)
            return null
          }
          const hasil = tambahHalaman(isi.susunan, judul, nama)
          if ('galat' in hasil) return hasil.galat
          ubahSusunan(() => hasil.susunan)
          setDialogHalaman(null)
          pilihHalaman(hasil.id)
          return null
        }}
      />
      <ConfirmDialog
        isOpen={konfirmasiHapusHalaman !== null}
        onOpenChange={(buka) => {
          if (!buka) setKonfirmasiHapusHalaman(null)
        }}
        judul="Hapus halaman?"
        labelSetuju="Hapus halaman"
        bahaya
        onSetuju={() => {
          const target = konfirmasiHapusHalaman
          setKonfirmasiHapusHalaman(null)
          if (!target) return
          const hasil = hapusHalaman(isi.susunan, target.id)
          if ('galat' in hasil) {
            tampilkanToast({ pesan: hasil.galat, nada: 'galat' })
            return
          }
          ubahSusunan(() => hasil)
          pilihHalaman('beranda')
        }}
      >
        <p>Isi halaman dan tautan menunya akan hilang dari draf.</p>
      </ConfirmDialog>
    </div>
  )
}
