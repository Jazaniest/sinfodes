import { formatTanggal } from '@/domain/format/tanggal'
import type { JenisMutasi, Mutasi } from '@/domain/mutasi/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { JenisSurat } from '@/domain/surat/jenis'
import { periksaPemohon } from '@/domain/surat/pemohon'
import { alamatLengkap } from '@/domain/wilayah/alamat'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Nik } from '@/ui/domain/Nik'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { PilihPenduduk } from '../../penduduk/PilihPenduduk'

const KEJADIAN: Readonly<Record<JenisMutasi, string>> = { lahir: 'kelahiran', meninggal: 'kematian', pindah: 'kepindahan', datang: 'kedatangan' }

type Props = {
  jenis: JenisSurat
  pemohon: Penduduk | null
  /** Bayi (surat kelahiran) atau almarhum (surat kematian). */
  subjek: Penduduk | null
  /** Mutasi sumber isian awal, bila ada. */
  mutasi: Mutasi | null
  onPemohon: (p: Penduduk | null) => void
  onSubjek: (p: Penduduk | null) => void
  hariIni: Date
}

/**
 * Langkah 2 (SPEC §7.4): pemohon dicari lewat nama/NIK. Surat tentang orang lain punya isian terpisah untuk yang
 * diterangkan. Data yang belum lengkap diperingatkan; pemohon Meninggal/Pindah memblokir.
 */
export function LangkahPemohon({ jenis, pemohon, subjek, mutasi, onPemohon, onSubjek, hariIni }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const cek = pemohon ? periksaPemohon(jenis, pemohon, subjek, mutasi) : null
  return (
    <div className="flex flex-col gap-5">
      {jenis.subjek !== 'pemohon' && (
        <PilihPenduduk
          key={`subjek-${subjek?.id ?? ''}`}
          label={jenis.subjek === 'kelahiran' ? 'Bayi yang diterangkan' : 'Penduduk yang meninggal'}
          terpilih={subjek}
          onPilih={onSubjek}
          filter={jenis.subjek === 'kematian' ? { status: 'Meninggal' } : { umurMax: 1 }}
          keterangan={jenis.subjek === 'kematian' ? 'Hanya penduduk yang kematiannya sudah dicatat.' : 'Bayi yang kelahirannya sudah dicatat.'}
          galat={cek?.blokir?.kolom === 'subjek' ? cek.blokir.pesan : undefined}
          hariIni={hariIni}
        />
      )}
      <PilihPenduduk
        key={`pemohon-${pemohon?.id ?? ''}`}
        label={jenis.subjek === 'pemohon' ? 'Pemohon' : 'Pemohon (pelapor)'}
        terpilih={pemohon}
        onPilih={onPemohon}
        hariIni={hariIni}
      />
      {mutasi && (
        <Banner nada="info" judul={`Isian diambil dari ${KEJADIAN[mutasi.jenis]} yang dicatat ${formatTanggal(mutasi.tanggal)}`}>
          Periksa kembali di langkah Isian sebelum diajukan.
        </Banner>
      )}
      {cek?.blokir?.kolom === 'pemohon' && (
        <Banner nada="galat" judul="Surat tidak bisa dibuat">
          {cek.blokir.pesan}
        </Banner>
      )}
      {cek && !cek.blokir && cek.peringatan.length > 0 && (
        <Banner nada="peringatan" judul="Periksa data pemohon">
          <ul className="list-disc pl-5">
            {cek.peringatan.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-1">Surat tetap boleh dibuat. Lengkapi datanya di profil penduduk bila perlu.</p>
        </Banner>
      )}
      {pemohon && (
        <DescriptionList
          judul="Ringkasan pemohon"
          items={[
            { label: 'NIK', nilai: <Nik nik={pemohon.nik} /> },
            { label: 'Alamat', nilai: alamatLengkap(pemohon, dusun, desa.istilahWilayah) },
            { label: 'Pekerjaan', nilai: pemohon.pekerjaan },
            { label: 'Status perkawinan', nilai: pemohon.statusPerkawinan },
            { label: 'Status', nilai: pemohon.statusDasar },
          ]}
        />
      )}
    </div>
  )
}
