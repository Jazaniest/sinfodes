import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { pemetaanRegister, variabelTema, type TemaDasar } from '@/domain/website/tema'
import { FotoWarta } from '@/ui/website/FotoWarta'
import { FotoKonteks, useBentukFoto } from '@/ui/website/foto-konteks'
import { Nameplate, PitaMotif } from '@/ui/website/Nameplate'

type TemaPratinjau = Omit<TemaDasar, 'warga'>

type Props = {
  tema: TemaPratinjau
  nama: string
  kecamatan: string
  kabupaten: string
  /** Lambang desa, dipakai bila logo belum diunggah. */
  lambang: string | null
  /** Tanggal yang sudah diformat, mis. "Kamis, 24 September 2026". */
  tanggal: string
}

const MENU = ['Beranda', 'Profil', 'Kabar', 'Layanan']
const KETERANGAN_CONTOH = 'Warga bergotong royong membersihkan parit dusun.'

/** Foto kosong: kotak putus-putus dengan keterangan, ditaruh menurut perlakuan foto tema. */
function FotoKosong() {
  const bentuk = useBentukFoto()
  const kotak = (
    <div className="flex aspect-[16/9] items-center justify-center rounded-1 border border-dashed border-garis-input bg-kertas-2 text-teks-kecil text-tinta-2">
      Belum ada foto sampul
    </div>
  )
  if (bentuk === 'penuh') {
    return (
      <figure data-foto="penuh" className="relative overflow-hidden">
        {kotak}
        <div aria-hidden data-lapisan className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 from-45% to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 px-3 pt-6 pb-2 text-teks-kecil text-putih">{KETERANGAN_CONTOH}</figcaption>
      </figure>
    )
  }
  return (
    <figure data-foto="bingkai">
      {kotak}
      <figcaption className="mt-1.5 text-teks-kecil text-tinta-2">{KETERANGAN_CONTOH}</figcaption>
    </figure>
  )
}

/** Cuplikan website di dalam wadah ber-variabel tema: kepala sesuai bentuknya, menu, satu kartu kabar, satu tombol, dan pita motif. */
function Cuplikan({ tema, nama, kecamatan, kabupaten, lambang, tanggal }: Props) {
  const menu = (
    <ul className="flex gap-1 bg-lembar px-4">
      {MENU.map((m, i) => (
        <li
          key={m}
          className={`inline-flex min-h-tombol items-center px-2 font-medium ${i === 0 ? 'text-biru underline decoration-2 underline-offset-8' : ''}`}
        >
          {m}
        </li>
      ))}
    </ul>
  )
  return (
    <FotoKonteks.Provider value={tema.foto}>
      <Nameplate
        nama={nama}
        kecamatan={kecamatan}
        kabupaten={kabupaten}
        motif={tema.motif}
        logo={tema.logo ?? lambang}
        tanggal={tanggal}
        bentuk={tema.kepala}
        menu={menu}
      />
      <div className="flex flex-col gap-[var(--desa-jarak)] px-5 py-5">
        {tema.sampul ? <FotoWarta berkas={tema.sampul} alt="" keterangan={KETERANGAN_CONTOH} rasio="lebar" utama /> : <FotoKosong />}
        <article className="flex flex-col gap-2 rounded-2 border border-garis bg-lembar p-4">
          <p className="text-label font-semibold tracking-wide text-biru uppercase">Pembangunan · 24 September 2026</p>
          <h3 className="font-serif text-judul-bagian font-medium">Semenisasi jalan dusun capai 70 persen</h3>
          <p className="text-tinta-2">Pengerjaan berjalan sesuai jadwal dan ditargetkan selesai bulan depan.</p>
          <span className="inline-flex h-tombol w-fit items-center rounded-1 bg-biru px-4 font-medium text-putih">Baca selengkapnya</span>
        </article>
        <PitaMotif motif={tema.motif} />
      </div>
    </FotoKonteks.Provider>
  )
}

type PropsBingkai = {
  label: string
  lebar: number
  tinggi: number
  skalaAwal: number
  tema: TemaPratinjau
  /** Tinggi mengikuti isi (pratinjau penyunting), bukan tinggi tetap. */
  tinggiOtomatis?: boolean
  /** Isi bisa diklik (pratinjau penyunting); bila tidak, isi dibuat inert seperti cuplikan. */
  interaktif?: boolean
  children: ReactNode
}

/**
 * Bingkai pratinjau `transform: scale()` dalam wadah tema. Dipakai cuplikan Tampilan Dasar dan pratinjau susunan
 * penyunting.
 */
export function BingkaiPratinjau({ label, lebar, tinggi, skalaAwal, tema, tinggiOtomatis = false, interaktif = false, children }: PropsBingkai) {
  const wadah = useRef<HTMLDivElement>(null)
  const isi = useRef<HTMLDivElement>(null)
  const [skala, setSkala] = useState(skalaAwal)
  const [tinggiIsi, setTinggiIsi] = useState(tinggi)
  useEffect(() => {
    const el = wadah.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ukur = () => setSkala(Math.min(1, el.clientWidth / lebar))
    ukur()
    const pengamat = new ResizeObserver(ukur)
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [lebar])
  useEffect(() => {
    const el = isi.current
    if (!el || !tinggiOtomatis || typeof ResizeObserver === 'undefined') return
    const ukur = () => setTinggiIsi(el.offsetHeight || tinggi)
    ukur()
    const pengamat = new ResizeObserver(ukur)
    pengamat.observe(el)
    return () => pengamat.disconnect()
  }, [tinggi, tinggiOtomatis])
  const gaya = {
    ...variabelTema(tema),
    ...pemetaanRegister(),
    width: lebar,
    height: tinggiOtomatis ? undefined : tinggi,
    transform: `scale(${skala})`,
    transformOrigin: 'top left',
  } as CSSProperties
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-teks-kecil font-medium text-tinta-2">{label}</figcaption>
      <div
        ref={wadah}
        className="w-full overflow-hidden rounded-2 border border-garis shadow-melayang"
        style={{ height: (tinggiOtomatis ? tinggiIsi : tinggi) * skala }}
      >
        <div
          ref={isi}
          data-situs
          aria-hidden={interaktif ? undefined : true}
          inert={interaktif ? undefined : true}
          className="skala-publik overflow-hidden bg-kertas font-sans text-teks text-tinta"
          style={gaya}
        >
          {children}
        </div>
      </div>
    </figure>
  )
}

/** Pratinjau langsung HP dan desktop (SPEC-V0.2 §11.1): `transform: scale()` dalam wadah tema, tanpa iframe. */
export function Pratinjau(props: Props) {
  return (
    <section aria-label="Pratinjau tampilan website" className="flex flex-col gap-4 self-start xl:sticky xl:top-6">
      <p className="text-label font-medium text-tinta-2 uppercase">Pratinjau</p>
      <BingkaiPratinjau label="HP (390 px)" lebar={390} tinggi={760} skalaAwal={0.6} tema={props.tema}>
        <Cuplikan {...props} />
      </BingkaiPratinjau>
      <BingkaiPratinjau label="Desktop (1280 px)" lebar={1280} tinggi={820} skalaAwal={0.36} tema={props.tema}>
        <Cuplikan {...props} />
      </BingkaiPratinjau>
      <p className="text-teks-kecil text-tinta-2">
        Template halaman sama untuk semua desa; yang berbeda adalah warna, huruf, sudut, kepadatan, motif, sampul, dan logo.
      </p>
    </section>
  )
}
