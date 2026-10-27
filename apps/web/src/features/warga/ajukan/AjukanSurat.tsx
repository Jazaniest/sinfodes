import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kirimPermohonanWarga, kunciWarga, opsiJenisSuratWarga, opsiKeluargaWarga } from '@/api/warga'
import { periksaIsian } from '@/domain/surat/jenis'
import { namaSyarat, type HasilKirimPermohonan } from '@/domain/warga/ajukan'
import { formatWhatsapp } from '@/domain/warga/akun'
import { namaJenisLengkap } from '@/domain/warga/permohonan'
import { useDrafFormulir } from '@/features/admin/useDrafFormulir'
import { IsianSurat } from '@/features/surat/IsianSurat'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { kunciKirimBaru } from '../kirim'
import { useSesiWarga } from '../sesi-konteks'
import {
  DRAF_KOSONG, drafAjukanSah, kunciDrafAjukan, LANGKAH_AJUKAN, syaratBelumDifoto, type AwalAjukan, type DrafAjukan, type FotoSyarat, type LangkahAjukan,
} from './ajukan'
import { LangkahJenis } from './LangkahJenis'
import { LangkahLampiran } from './LangkahLampiran'
import { LangkahPeriksa } from './LangkahPeriksa'
import { LangkahUntuk } from './LangkahUntuk'

type Props = {
  /** Ajukan ulang dari permohonan yang ditolak: mulai di langkah isian dengan isian lamanya. */
  awal?: AwalAjukan | null
  kecilkan?: (berkas: File) => Promise<File>
}
type GagalKirim = { pesan: string; bisaUlang: boolean }

function Terkirim({ hasil, whatsapp }: { hasil: HasilKirimPermohonan; whatsapp: string }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-judul-halaman font-medium">Permohonan terkirim</h1>
      <p>
        Nomor tiket <span className="font-mono font-medium">{hasil.tiket}</span>
      </p>
      <p className="text-tinta-2">Kami kabari lewat WhatsApp ke {formatWhatsapp(whatsapp)} setiap ada perkembangan.</p>
      <TautanTombol href={`/warga/riwayat/${hasil.id}`} varian="utama">
        Lihat perkembangan
      </TautanTombol>
      <TautanTombol href="/warga">Kembali ke Beranda</TautanTombol>
    </div>
  )
}

/**
 * Ajukan surat dari HP dalam lima langkah (SPEC §10). Isian tersimpan sebagai draf di perangkat; foto hanya di memori.
 * Kiriman yang gagal tidak menghapus apa pun, dan *Kirim ulang* memakai kunci yang sama (fokus review 1).
 */
export function AjukanSurat({ awal, kecilkan }: Props) {
  const sesi = useSesiWarga()
  const queryClient = useQueryClient()
  const jenisQ = useQuery(opsiJenisSuratWarga())
  const keluargaQ = useQuery(opsiKeluargaWarga())
  const { draf, simpan, buang } = useDrafFormulir(kunciDrafAjukan(sesi.penduduk.id), drafAjukanSah)
  const [form, setForm] = useState<DrafAjukan>(() =>
    awal ? { langkah: 'isian', jenisId: awal.jenisId, untukId: awal.untukId, isian: awal.isian } : (draf?.isi ?? DRAF_KOSONG),
  )
  const [dariDraf, setDariDraf] = useState(() => !awal && draf !== null && draf.isi.jenisId !== null)
  const [foto, setFoto] = useState<FotoSyarat>({})
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [kunci, setKunci] = useState(kunciKirimBaru)
  const [memuat, setMemuat] = useState(false)
  const [gagal, setGagal] = useState<GagalKirim | null>(null)
  const [terkirim, setTerkirim] = useState<HasilKirimPermohonan | null>(null)
  const mengirim = useRef(false)
  const judul = useRef<HTMLHeadingElement>(null)
  const pertama = useRef(true)

  // Pindah langkah: fokus ke judul langkah, supaya pembaca layar dan pengguna keyboard mulai dari atas.
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false
      return
    }
    judul.current?.focus()
  }, [form.langkah])

  if (terkirim) return <Terkirim hasil={terkirim} whatsapp={sesi.whatsapp} />
  if (jenisQ.isPending || keluargaQ.isPending) return <BarisKerangka jumlah={4} label="Memuat jenis surat…" />
  if (jenisQ.isError || keluargaQ.isError) {
    return (
      <ErrorState
        pesan={pesanGalat(jenisQ.error ?? keluargaQ.error)}
        onCobaLagi={() => {
          void jenisQ.refetch()
          void keluargaQ.refetch()
        }}
      />
    )
  }

  const jenis = jenisQ.data.find((j) => j.id === form.jenisId) ?? null
  const untuk = keluargaQ.data.anggota.find((a) => a.id === form.untukId) ?? null
  const urutanForm = LANGKAH_AJUKAN.findIndex((l) => l.id === form.langkah)
  // Draf lama bisa menunjuk jenis yang kini tidak online, atau anggota yang sudah pindah: mundur ke langkah yang perlu.
  const langkah: LangkahAjukan = !jenis ? 'jenis' : !untuk && urutanForm > 1 ? 'untuk' : form.langkah
  const urutan = LANGKAH_AJUKAN.findIndex((l) => l.id === langkah)

  const ubah = (sebagian: Partial<DrafAjukan>) => {
    const baru = { ...form, ...sebagian }
    setForm(baru)
    simpan(baru)
  }
  const ke = (tujuan: LangkahAjukan) => {
    setGalat({})
    setGagal(null)
    // Pesan draf (mis. "pilih lagi fotonya") hanya untuk langkah tempat isian dilanjutkan.
    setDariDraf(false)
    ubah({ langkah: tujuan })
  }
  const mulaiDariAwal = () => {
    buang()
    setForm(DRAF_KOSONG)
    setFoto({})
    setGalat({})
    setDariDraf(false)
  }

  const lanjut = () => {
    if (!jenis) return
    if (langkah === 'untuk') {
      if (!form.untukId) setGalat({ untukId: 'Pilih untuk siapa surat ini.' })
      else ke('isian')
    } else if (langkah === 'isian') {
      const g = periksaIsian(jenis, form.isian)
      if (Object.keys(g).length > 0) setGalat(g)
      else ke('lampiran')
    } else if (langkah === 'lampiran') {
      const kurang = syaratBelumDifoto(jenis, foto)
      if (kurang.length > 0) setGalat(Object.fromEntries(kurang.map((s) => [s, `Foto ${namaSyarat(s)} wajib dilampirkan.`])))
      else ke('periksa')
    }
  }

  const kirim = async () => {
    if (mengirim.current || !jenis || !untuk) return
    mengirim.current = true
    setMemuat(true)
    setGagal(null)
    const lampiran = jenis.syarat.flatMap((s) => {
      const f = foto[s]
      return f ? [{ syarat: s, berkas: f.berkas }] : []
    })
    try {
      const hasil = await kirimPermohonanWarga(
        { kunci, jenisId: jenis.id, untukId: untuk.id, isian: form.isian, lampiran: lampiran.map((l) => ({ syarat: l.syarat })) },
        lampiran.map((l) => l.berkas),
      )
      buang()
      setTerkirim(hasil)
      setForm(DRAF_KOSONG)
      setFoto({})
      setKunci(kunciKirimBaru())
      void queryClient.invalidateQueries({ queryKey: kunciWarga.riwayat })
      void queryClient.invalidateQueries({ queryKey: kunciWarga.beranda })
    } catch (e) {
      const isianSalah = e instanceof GalatApi ? Object.entries(e.fields).filter(([k]) => k.startsWith('isian.')) : []
      if (isianSalah.length > 0) {
        setGalat(Object.fromEntries(isianSalah.map(([k, v]) => [k.slice('isian.'.length), v])))
        ubah({ langkah: 'isian' })
      } else if (e instanceof GalatApi && e.fields.untukId) {
        setGalat({ untukId: e.fields.untukId })
        ubah({ langkah: 'untuk' })
      } else if (e instanceof GalatApi && e.kode === 'VALIDATION') {
        setGagal({ pesan: Object.values(e.fields)[0] ?? e.message, bisaUlang: false })
      } else {
        // Koneksi putus atau server sibuk: isian dan foto tetap, kirim ulang dengan kunci yang sama (fokus review 1).
        setGagal({ pesan: pesanGalat(e), bisaUlang: true })
      }
    } finally {
      mengirim.current = false
      setMemuat(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-label font-medium text-tinta-2 uppercase">
          Ajukan surat · Langkah {urutan + 1} dari {LANGKAH_AJUKAN.length}
        </p>
        <h1 ref={judul} tabIndex={-1} className="font-serif text-judul-halaman font-medium outline-none">
          {LANGKAH_AJUKAN[urutan].judul}
        </h1>
        {jenis && langkah !== 'jenis' && <p className="text-tinta-2">{namaJenisLengkap(jenis)}</p>}
      </header>

      {dariDraf && (
        <Banner
          nada="info"
          judul="Melanjutkan isian yang tersimpan di HP ini"
          aksi={
            <Tombol varian="teks" onPress={mulaiDariAwal}>
              Mulai dari awal
            </Tombol>
          }
        >
          {urutan >= 3 ? 'Foto lampiran tidak ikut tersimpan; pilih lagi fotonya.' : 'Isian Anda masih ada.'}
        </Banner>
      )}
      {awal && (
        <Banner nada="peringatan" judul="Mengajukan ulang permohonan yang ditolak">
          {awal.alasanDitolak ? `Alasan penolakan: ${awal.alasanDitolak} ` : ''}Perbaiki isian dan lampirannya, lalu kirim lagi.
        </Banner>
      )}

      {langkah === 'jenis' && (
        <LangkahJenis
          jenis={jenisQ.data}
          dipilihId={form.jenisId}
          onPilih={(j) =>
            ubah(
              j.id === form.jenisId
                ? { langkah: 'untuk' }
                : { jenisId: j.id, untukId: null, isian: {}, langkah: 'untuk' },
            )
          }
        />
      )}
      {langkah === 'untuk' && jenis && (
        <LangkahUntuk
          jenis={jenis}
          anggota={keluargaQ.data.anggota}
          pendudukId={sesi.penduduk.id}
          nilai={form.untukId}
          onUbah={(id) => ubah({ untukId: id })}
          galat={galat.untukId}
        />
      )}
      {langkah === 'isian' && jenis && (
        <IsianSurat
          jenis={jenis}
          nilai={form.isian}
          galat={galat}
          bisaUbah
          onUbah={(k, v) => ubah({ isian: { ...form.isian, [k]: v } })}
        />
      )}
      {langkah === 'lampiran' && jenis && (
        <LangkahLampiran
          jenis={jenis}
          foto={foto}
          onUbah={(s, f) => {
            setFoto((lama) => ({ ...lama, [s]: f }))
            setGalat((lama) => Object.fromEntries(Object.entries(lama).filter(([k]) => k !== s)))
          }}
          galat={galat}
          kecilkan={kecilkan}
        />
      )}
      {langkah === 'periksa' && jenis && untuk && (
        <LangkahPeriksa jenis={jenis} untuk={untuk.nama} isian={form.isian} foto={foto} />
      )}

      {gagal && (
        <Banner nada="galat" judul={gagal.bisaUlang ? 'Permohonan belum terkirim' : 'Permohonan tidak bisa dikirim'}>
          {gagal.pesan}
          {gagal.bisaUlang && ' Isian dan foto Anda masih tersimpan.'}
        </Banner>
      )}

      {langkah !== 'jenis' && (
        <div className="flex flex-wrap gap-3">
          <Tombol onPress={() => ke(LANGKAH_AJUKAN[Math.max(0, urutan - 1)].id)}>Kembali</Tombol>
          {langkah === 'periksa' ? (
            <Tombol varian="utama" memuat={memuat} onPress={() => void kirim()}>
              {gagal?.bisaUlang ? 'Kirim ulang' : 'Kirim permohonan'}
            </Tombol>
          ) : (
            <Tombol varian="utama" onPress={lanjut}>
              Lanjut
            </Tombol>
          )}
        </div>
      )}
    </div>
  )
}
