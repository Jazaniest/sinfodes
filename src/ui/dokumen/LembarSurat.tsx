// Huruf surat hanya dimuat bersama lembar surat (rute Layanan Surat), bukan di bundel awal panel.
import '@fontsource/tinos/latin-400.css'
import '@fontsource/tinos/latin-700.css'
import '@fontsource/arimo/latin-400.css'
import '@fontsource/arimo/latin-700.css'
import '@fontsource/ibm-plex-serif/latin-400.css'
import '@fontsource/ibm-plex-serif/latin-700.css'
import type { CSSProperties, ReactNode } from 'react'
import type { IsiLembar } from '@/domain/surat/isi-lembar'
import type { HurufSurat, TataLetakSurat, UkuranKertas } from '@/domain/surat/tata-letak'
import { cn } from '../cn'
import { BlokTandaTangan, type DataTandaTangan } from './BlokTandaTangan'
import { KopSurat, type DataKop } from './KopSurat'
import { QrVerifikasi } from './QrVerifikasi'

export type VerifikasiLembar = { kode: string; domain: string; isiQr: string }

export type PropsLembarSurat = {
  kop: DataKop
  isi: IsiLembar
  /** Null untuk draf: nomor diberikan saat ditandatangani. */
  nomor: string | null
  tandaTangan: DataTandaTangan
  /** Kop, kertas, huruf, blok tanda tangan, dan posisi QR (SPEC-V0.2 12.2). Satu-satunya sumber tampilan lembar. */
  tataLetak: TataLetakSurat
  /** Null untuk draf. */
  verifikasi: VerifikasiLembar | null
  /** Mode demo: kaki surat menandai simulasi TTE. */
  simulasi: boolean
  /** Cap di pojok kanan atas (DRAF, DIBATALKAN); tidak ikut dicetak. */
  penanda?: ReactNode
}

/** A4 21 × 29,7 cm; F4 21,5 × 33 cm (SPEC §7.5). */
const KERTAS: Readonly<Record<UkuranKertas, string>> = { A4: 'w-[21cm] min-h-[29.7cm]', F4: 'w-[21.5cm] min-h-[33cm]' }
const HURUF: Readonly<Record<HurufSurat, string>> = { Tinos: 'font-surat-tinos', Arimo: 'font-surat-arimo', 'Plex Serif': 'font-surat-plex' }

/**
 * Lembar surat siap cetak (SPEC §7.5, SPEC-V0.2 12.2). Margin, ukuran huruf, dan jarak baris ditulis inline dalam mm dan
 * pt supaya layar dan cetak sama. Standar: margin atas 2, kiri 3, kanan 2, bawah 2 cm; huruf 12 pt; jarak baris 1,15
 * (lazim di naskah dinas) supaya jenis surat terpanjang tetap muat satu halaman A4. QR, kode verifikasi, dan nomor
 * selalu dirender: tata letak hanya memilih tempatnya.
 */
export function LembarSurat({ kop, isi, nomor, tandaTangan, tataLetak, verifikasi, simulasi, penanda }: PropsLembarSurat) {
  const { kertas, huruf, qr } = tataLetak
  const qrDiKaki = tandaTangan.mode === 'basah' && verifikasi !== null
  const gaya: CSSProperties = {
    paddingTop: `${kertas.margin.atas}mm`,
    paddingRight: `${kertas.margin.kanan}mm`,
    paddingBottom: `${kertas.margin.bawah}mm`,
    paddingLeft: `${kertas.margin.kiri}mm`,
    fontSize: `${huruf.ukuranPt}pt`,
    lineHeight: huruf.spasi,
  }
  const bawahTtd = qr.posisi === 'bawah-tanda-tangan'
  const kanan = qr.posisi === 'kanan-bawah'
  const kodeVerifikasi = verifikasi && (
    <footer
      className={cn(
        'flex items-end gap-[0.3cm] pt-[0.4cm] text-[8pt] leading-snug',
        bawahTtd ? (tataLetak.tandaTangan.posisi === 'tengah' ? 'justify-center text-center' : 'justify-start') : 'mt-auto',
        // Urutan dibalik: QR di kanan, teks rata kanan; `justify-start` pada baris terbalik berarti tepi kanan.
        kanan && 'flex-row-reverse justify-start text-right',
      )}
    >
      {qrDiKaki && <QrVerifikasi isi={verifikasi.isiQr} label={`Kode QR verifikasi ${verifikasi.kode}`} className="size-[1.8cm] shrink-0" />}
      <p>
        Keaslian surat dapat diperiksa di {verifikasi.domain}/verifikasi dengan kode{' '}
        <span className="font-bold">{verifikasi.kode}</span>
        {simulasi && (
          <>
            <br />
            Simulasi TTE — demo Sinfodes
          </>
        )}
      </p>
    </footer>
  )
  return (
    <article
      data-terang
      aria-label={`Lembar ${isi.judul.toLocaleLowerCase('id-ID')}`}
      style={gaya}
      className={cn('relative flex flex-col bg-putih text-tinta', KERTAS[kertas.ukuran], HURUF[huruf.keluarga])}
    >
      {penanda && <div className="absolute top-[0.8cm] right-[2cm] print:hidden">{penanda}</div>}
      <KopSurat kop={kop} tata={tataLetak.kop} />
      <h2 className="mt-[0.6cm] text-center font-bold underline">{isi.judul}</h2>
      <p className="text-center">Nomor: {nomor ?? '…'}</p>
      <p className="mt-[0.6cm] indent-[1.25cm] text-justify">{isi.pembuka}</p>
      {isi.blok.map((b, i) =>
        b.jenis === 'tabel' ? (
          <table key={i} className="my-[0.3cm] ml-[1.25cm] border-collapse">
            <tbody>
              {b.baris.map((r) => (
                <tr key={r.label}>
                  <td className="w-[5cm] align-top">{r.label}</td>
                  <td className="w-[0.5cm] align-top">:</td>
                  <td className={cn('align-top', r.tebal && 'font-bold')}>{r.nilai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p key={i} className="mt-[0.3cm] indent-[1.25cm] text-justify">
            {b.teks}
          </p>
        ),
      )}
      <BlokTandaTangan data={tandaTangan} tata={tataLetak.tandaTangan} bawah={bawahTtd ? kodeVerifikasi : null} />
      {!bawahTtd && kodeVerifikasi}
    </article>
  )
}
