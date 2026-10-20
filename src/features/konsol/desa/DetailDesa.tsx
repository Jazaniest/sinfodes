import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, opsiDetailDesaKonsol, ubahPeriodeTagihan } from '@/api/konsol'
import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import { formatAngka, formatRupiah, formatUkuranKb } from '@/domain/format/angka'
import { formatTanggal, formatWaktuLog, tanggalIsoWib } from '@/domain/format/tanggal'
import { HARGA_TRIWULAN, type DetailDesaKonsol } from '@/domain/konsol/schema'
import { LABEL_PERIODE_TAGIHAN, PERIODE_TAGIHAN, type PeriodeTagihan } from '@/domain/langganan/tagihan'
import { CapTagihan } from '@/features/langganan/CapTagihan'
import { jumlahSelesai, LABEL_LANGKAH_PERSIAPAN, LANGKAH_PERSIAPAN } from '@/domain/wilayah/persiapan'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { BarChart } from '@/ui/grafik/BarChart'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Checkbox } from '@/ui/isian/Checkbox'
import { Select } from '@/ui/isian/Select'
import { Timeline } from '@/ui/data/Timeline'
import { tampilkanToast } from '@/ui/toast/antrean'
import { TabNav } from '@/ui/navigasi/TabNav'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { AksesBantuanDesa } from './AksesBantuanDesa'
import { DialogUbahAlamat } from './DialogUbahAlamat'
import { DialogUbahStatus } from './DialogUbahStatus'
import { DialogUndangSekdes } from './DialogUndangSekdes'
import { LABEL_TAB_DETAIL_DESA, TAB_DETAIL_DESA, type TabDetailDesa } from './tab-detail'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'
const redup = 'text-tinta-2'
const sel = 'border-b border-garis py-1.5'
const kepala = 'border-b border-garis py-1.5 text-label font-medium text-tinta-2 uppercase'

function TabRingkasan({ d }: { d: DetailDesaKonsol }) {
  const [ubahAlamat, setUbahAlamat] = useState(false)
  return (
    <>
      <DescriptionList
        items={[
          { label: 'Kode desa', nilai: <span className="font-mono">{d.kodeDesa}</span> },
          { label: 'Status', nilai: d.status },
          { label: 'Paket', nilai: d.paket },
          { label: 'Alamat kantor', nilai: d.alamatKantor || null },
          { label: 'Surel', nilai: d.surel || null },
          { label: 'Telepon', nilai: d.telepon || null },
          { label: 'Kepala desa', nilai: d.kontak.kades },
          { label: 'Sekretaris Desa', nilai: d.kontak.sekdes && `${d.kontak.sekdes.nama} · ${d.kontak.sekdes.email}` },
          { label: 'Operator', nilai: d.kontak.operator && `${d.kontak.operator.nama} · ${d.kontak.operator.email}` },
          {
            label: 'Alamat',
            nilai: (
              <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Tautan href={keAlamat({ jenis: 'desa', label: d.slug })} className="font-mono">
                  {`${d.slug}.${DOMAIN_INDUK}`}
                </Tautan>
                <Tombol varian="teks" onPress={() => setUbahAlamat(true)}>
                  Ubah alamat
                </Tombol>
              </span>
            ),
          },
          {
            label: 'Alamat lama',
            nilai:
              d.aliasAlamat.length > 0 ? (
                <span className="font-mono">{d.aliasAlamat.join(', ')}</span>
              ) : (
                <span className={redup}>Belum pernah diganti</span>
              ),
          },
        ]}
      />
      {ubahAlamat && <DialogUbahAlamat desaId={d.id} alamatSekarang={d.slug} onTutup={() => setUbahAlamat(false)} />}
    </>
  )
}

function TabPersiapan({ d }: { d: DetailDesaKonsol }) {
  const [undang, setUndang] = useState(false)
  const selesai = jumlahSelesai(d.persiapan)
  return (
    <section aria-labelledby="judul-persiapan" className="flex max-w-2xl flex-col gap-4">
      <h2 id="judul-persiapan" className={judulBagian}>
        Persiapan desa
      </h2>
      <MiniBar label="Persiapan" nilai={selesai} maks={LANGKAH_PERSIAPAN.length} keterangan={`${selesai} dari ${LANGKAH_PERSIAPAN.length} langkah selesai`} />
      <ol aria-label="Langkah persiapan" className="divide-y divide-garis border-y border-garis bg-lembar">
        {d.persiapan.map((l, i) => (
          <li key={l.langkah} className="flex items-center gap-3 px-4 py-3">
            <span className="font-mono text-tinta-2">{i + 1}</span>
            <span className="min-w-0 flex-1">{LABEL_LANGKAH_PERSIAPAN[l.langkah]}</span>
            <Cap varian={l.selesai ? 'selesai' : 'menunggu'} label={l.selesai ? 'Selesai' : 'Belum'} />
          </li>
        ))}
      </ol>
      {d.bisaUndangSekdes && (
        <div className="flex flex-col items-start gap-3">
          <p className={redup}>
            Langkah Tambah pengguna hanya bisa dikerjakan Sekretaris Desa, dan desa ini belum punya. Undang Sekretaris Desa supaya
            desa bisa menambah penggunanya sendiri.
          </p>
          <Tombol onPress={() => setUndang(true)}>Undang Sekretaris Desa</Tombol>
        </div>
      )}
      {undang && <DialogUndangSekdes desaId={d.id} namaDesa={d.nama} onTutup={() => setUndang(false)} />}
    </section>
  )
}

function Deret(props: { id: string; judul: string; kolom: string; kosong: string; satuan: string; tabel: boolean; data: readonly { kunci: string; label: string; jumlah: number }[] }) {
  let isi: ReactNode
  if (props.data.every((b) => b.jumlah === 0)) isi = <p className={redup}>{props.kosong}</p>
  else if (props.tabel) {
    isi = (
      <table className="w-full max-w-md">
        <caption className="sr-only">{props.judul}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${kepala} text-left`}>
              {props.kolom}
            </th>
            <th scope="col" className={`${kepala} text-right`}>
              Jumlah
            </th>
          </tr>
        </thead>
        <tbody>
          {props.data.map((b) => (
            <tr key={b.kunci}>
              <th scope="row" className={`${sel} text-left font-normal`}>
                {b.label}
              </th>
              <td className={`${sel} text-right font-mono tabular-nums`}>{formatAngka(b.jumlah)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } else {
    isi = <BarChart label={props.judul} satuan={props.satuan} batang={props.data.map((b) => ({ id: b.kunci, label: b.label, nilai: b.jumlah, href: null }))} />
  }
  return (
    <section aria-labelledby={props.id} className="flex flex-col gap-3">
      <h2 id={props.id} className={judulBagian}>
        {props.judul}
      </h2>
      {isi}
    </section>
  )
}

/** Keaktifan (SPEC-V0.2 §7): tanda pemakaian Sinfodes oleh desa, bukan isi data desa. */
function TabKeaktifan({ d }: { d: DetailDesaKonsol }) {
  const [tabel, setTabel] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <DescriptionList
        items={[
          { label: 'Terakhir dipakai', nilai: d.aktivitasTerakhir ? formatWaktuLog(d.aktivitasTerakhir) : <span className={redup}>Belum ada</span> },
          { label: 'Akun aktif', nilai: `${formatAngka(d.penggunaAktif)} akun masuk dalam 30 hari terakhir` },
          { label: 'Penyimpanan berkas', nilai: formatUkuranKb(d.penyimpananKb) },
        ]}
      />
      <AksesBantuanDesa d={d} />
      <Checkbox isSelected={tabel} onChange={setTabel} className="self-start">
        Lihat sebagai tabel
      </Checkbox>
      <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
        <Deret
          id="judul-masuk-mingguan"
          judul="Masuk panel per minggu"
          kolom="Minggu mulai"
          kosong="Belum ada yang masuk panel dalam 12 minggu terakhir."
          satuan="kali masuk"
          tabel={tabel}
          data={d.masukPerMinggu.map((m) => ({ kunci: m.mulai, label: formatTanggal(m.mulai, 'pendek'), jumlah: m.jumlah }))}
        />
      </div>
    </div>
  )
}

/** Periode tagihan berlaku mulai tagihan berikutnya; tagihan yang sudah terbit tidak berubah (rencana 7D-2 keputusan 8). */
function PemilihPeriode({ d }: { d: DetailDesaKonsol }) {
  const queryClient = useQueryClient()
  const ubah = useMutation({
    mutationFn: (periode: PeriodeTagihan) => ubahPeriodeTagihan(d.id, periode),
    onSuccess: async () => {
      tampilkanToast({ pesan: 'Periode tagihan diubah. Berlaku mulai tagihan berikutnya.', nada: 'berhasil' })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })
  return (
    <Select
      label="Periode tagihan"
      labelTersembunyi
      className="w-44"
      isDisabled={ubah.isPending}
      pilihan={PERIODE_TAGIHAN.map((p) => ({ id: p, label: LABEL_PERIODE_TAGIHAN[p] }))}
      nilai={d.langganan.periodeTagihan}
      onUbah={(id) => {
        const baru = PERIODE_TAGIHAN.find((p) => p === id)
        if (baru && baru !== d.langganan.periodeTagihan) ubah.mutate(baru)
      }}
    />
  )
}

function StatusDesa({ d }: { d: DetailDesaKonsol }) {
  const [ubah, setUbah] = useState(false)
  return (
    <section aria-labelledby="judul-status-desa" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="judul-status-desa" className={judulBagian}>
          {`Status desa: ${d.status}`}
        </h2>
        <Tombol onPress={() => setUbah(true)}>Ubah status</Tombol>
      </div>
      {d.riwayatStatus.length === 0 ? (
        <p className={redup}>Belum ada perubahan status.</p>
      ) : (
        <Timeline
          label="Riwayat status"
          entri={d.riwayatStatus.map((r, i) => ({
            id: `${i}-${r.pada}`,
            waktu: formatWaktuLog(r.pada),
            judul: `${r.dari} → ${r.ke} · ${r.oleh.nama}`,
            keterangan: r.alasan,
          }))}
        />
      )}
      {ubah && <DialogUbahStatus desa={d} onTutup={() => setUbah(false)} />}
    </section>
  )
}

function TabLangganan({ d, hariIni }: { d: DetailDesaKonsol; hariIni: string }) {
  const l = d.langganan
  const masa =
    l.mulai && l.sampai ? `${formatTanggal(l.mulai)} - ${formatTanggal(l.sampai)}` : <span className={redup}>Belum ditentukan, desa masih dalam persiapan</span>
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <DescriptionList
        items={[
          { label: 'Paket', nilai: `${l.paket} · ${formatRupiah(HARGA_TRIWULAN[l.paket])} per triwulan` },
          { label: 'Penagihan', nilai: <PemilihPeriode d={d} /> },
          { label: d.status === 'Uji coba' ? 'Masa uji coba' : 'Masa aktif', nilai: masa },
        ]}
      />
      <section aria-labelledby="judul-tagihan" className="flex flex-col gap-2">
        <h2 id="judul-tagihan" className={judulBagian}>
          Tagihan
        </h2>
        {d.tagihan.length === 0 ? (
          <p className={redup}>Belum ada tagihan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem]">
              <caption className="sr-only">Tagihan</caption>
              <thead>
                <tr>
                  <th scope="col" className={`${kepala} text-left`}>
                    Nomor
                  </th>
                  <th scope="col" className={`${kepala} text-left`}>
                    Periode
                  </th>
                  <th scope="col" className={`${kepala} text-right`}>
                    Nominal
                  </th>
                  <th scope="col" className={`${kepala} text-left`}>
                    Jatuh tempo
                  </th>
                  <th scope="col" className={`${kepala} text-left`}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...d.tagihan].reverse().map((t) => {
                  return (
                    <tr key={t.id}>
                      <th scope="row" className={`${sel} text-left font-mono font-normal`}>
                        <Tautan href={`/konsol/tagihan/${encodeURIComponent(t.id)}`}>{t.nomor}</Tautan>
                      </th>
                      <td className={sel}>{t.periode.label}</td>
                      <td className={`${sel} text-right tabular-nums`}>{formatRupiah(t.nominal)}</td>
                      <td className={sel}>{formatTanggal(t.jatuhTempo, 'pendek')}</td>
                      <td className={sel}>
                        <CapTagihan tagihan={t} hariIni={hariIni} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-teks-kecil text-tinta-2">Tagihan contoh untuk demo; pembayaran diverifikasi di menu Tagihan.</p>
      </section>
      <StatusDesa d={d} />
    </div>
  )
}

/** Detail desa (SPEC §11): tab Ringkasan, Persiapan, Penggunaan, dan Langganan. Tab disimpan di alamat halaman. */
export function DetailDesa({ id, tab, sekarang = new Date() }: { id: string; tab: TabDetailDesa; sekarang?: Date }) {
  const kueri = useQuery(opsiDetailDesaKonsol(id))
  const d = kueri.data
  if (kueri.isError && kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
    return (
      <EmptyState
        judulHalaman
        judul="Desa tidak ditemukan"
        keterangan="Alamatnya mungkin salah, atau desa ini sudah dihapus."
        aksi={<Tautan href="/konsol/desa">Kembali ke daftar desa</Tautan>}
      />
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={[{ label: 'Desa', href: '/konsol/desa' }]}
        judul={d ? `Desa ${d.nama}` : 'Detail desa'}
        meta={d && `${d.kecamatan.nama} · ${d.kabupaten.nama} · ${d.provinsi.nama} · ${d.status}`}
        tab={
          <TabNav
            label="Bagian detail desa"
            items={TAB_DETAIL_DESA.map((t) => ({
              label: LABEL_TAB_DETAIL_DESA[t],
              href: t === 'ringkasan' ? `/konsol/desa/${id}` : `/konsol/desa/${id}?tab=${t}`,
              aktif: t === tab,
            }))}
          />
        }
      />
      {kueri.isPending && <BarisKerangka jumlah={6} label="Memuat detail desa…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {d && tab === 'ringkasan' && <TabRingkasan d={d} />}
      {d && tab === 'persiapan' && <TabPersiapan d={d} />}
      {d && tab === 'keaktifan' && <TabKeaktifan d={d} />}
      {d && tab === 'langganan' && <TabLangganan d={d} hariIni={tanggalIsoWib(sekarang)} />}
    </div>
  )
}
