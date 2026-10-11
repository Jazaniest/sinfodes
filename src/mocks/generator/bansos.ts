import { tahanPenyaluran, type PenerimaBansos, type ProgramBansos, type StatusPenyaluran } from '@/domain/bansos/schema'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import type { Keluarga } from '@/domain/keluarga/schema'
import type { Mutasi } from '@/domain/mutasi/schema'
import type { Penduduk } from '@/domain/penduduk/schema'
import type { Desa } from '@/domain/wilayah/schema'
import type { Acak } from '../prng'

type Opsi = { desa: Desa; penduduk: readonly Penduduk[]; keluarga: readonly Keluarga[]; mutasi: readonly Mutasi[]; acuan: Date }

const PERIODE = ['Januari–Maret', 'April–Juni', 'Juli–September', 'Oktober–Desember'] as const

/** SPEC §12.6. Jadwal penyaluran tetap per tahun ("MM-DD"); BLT tahap III jatuh 30 September. */
const PROGRAM = [
  {
    kode: 'blt', nama: 'BLT Dana Desa', singkat: 'BLT-DD', sumber: 'Dana Desa', dikelolaDesa: true,
    bentuk: 'Rp300.000 per bulan, dibayarkan per 3 bulan', jadwal: ['03-31', '06-30', '09-30', '12-15'], jumlah: 38,
  },
  {
    kode: 'pkh', nama: 'Program Keluarga Harapan', singkat: 'PKH', sumber: 'Kementerian Sosial', dikelolaDesa: false,
    bentuk: 'Bantuan tunai bersyarat sesuai komponen keluarga', jadwal: ['03-20', '06-19', '09-18', '12-11'], jumlah: 64,
  },
  {
    kode: 'pangan', nama: 'Bantuan Pangan Beras', singkat: 'Bantuan Pangan', sumber: 'Badan Pangan Nasional', dikelolaDesa: false,
    bentuk: 'Beras 10 kg per bulan, disalurkan per 3 bulan', jadwal: ['03-15', '06-15', '09-15', '12-15'], jumlah: 112,
  },
] as const

/** Keluarga Syahrial dan Siti Rahmah: penerima BLT dan Bantuan Pangan (SPEC §12.9). */
const KK_PERSONA = 'kk_syahrial'

/**
 * Tiga program bansos dan keluarga penerimanya (SPEC §12.6). Penerima BLT tidak sekaligus PKH; Bantuan Pangan boleh
 * tumpang tindih. Satu penerima BLT atas nama penduduk yang meninggal bulan ini sudah ditandai perlu ditinjau.
 */
export function bangkitkanBansos(acak: Acak, o: Opsi): { program: ProgramBansos[]; penerima: PenerimaBansos[] } {
  const hariIni = tanggalIsoWib(o.acuan)
  const tahun = hariIni.slice(0, 4)
  const indeks = new Map(o.penduduk.map((p) => [p.id, p]))
  const kkDesa = o.keluarga.filter((k) => k.desaId === o.desa.id)
  const kode = o.desa.kodeSurat.toLowerCase()
  const program = PROGRAM.map(
    (p): ProgramBansos => ({
      id: `bns_${kode}_${p.kode}`, desaId: o.desa.id, nama: `${p.nama} ${tahun}`, singkat: p.singkat, sumber: p.sumber,
      dikelolaDesa: p.dikelolaDesa, bentuk: p.bentuk,
      tahap: p.jadwal.map((j, i) => ({ ke: i + 1, periode: PERIODE[i], jadwal: `${tahun}-${j}` })),
    }),
  )
  const [blt, pkh, pangan] = program
  const [jumlahBlt, jumlahPkh, jumlahPangan] = PROGRAM.map((p) => p.jumlah)

  const kepala = (k: Keluarga): Penduduk => {
    const p = indeks.get(k.kepalaKeluargaId)
    if (!p) throw new Error(`Kepala keluarga ${k.id} tidak ada`)
    return p
  }
  // Pengurus PKH biasanya ibu: atas nama istri bila ada.
  const pengurusPkh = (k: Keluarga): Penduduk =>
    k.anggotaIds.map((id) => indeks.get(id)).find((p) => p?.hubunganKeluarga === 'Istri' && p.statusDasar === 'Hidup') ?? kepala(k)
  const desil = new Map<string, number>()
  const desilKk = (id: string): number => {
    const ada = desil.get(id)
    if (ada !== undefined) return ada
    const baru = acak.berbobot([[1, 30], [2, 35], [3, 20], [4, 15]])
    desil.set(id, baru)
    return baru
  }
  // Tahap yang sudah lewat tersalur; sebagian kecil penerima belum mengambil tahap terakhir.
  const penyaluran = (p: ProgramBansos, bolehBelum: boolean): StatusPenyaluran[] => {
    const terakhirLewat = p.tahap.findLastIndex((t) => t.jadwal < hariIni)
    return p.tahap.map((t, i) =>
      t.jadwal >= hariIni ? 'dijadwalkan' : i === terakhirLewat && bolehBelum && acak.peluang(0.05) ? 'belum-diambil' : 'tersalur',
    )
  }
  const penerima: PenerimaBansos[] = []
  const tambah = (p: ProgramBansos, k: Keluarga, atasNama: Penduduk, perluDitinjau: PenerimaBansos['perluDitinjau']) => {
    const salur = penyaluran(p, k.id !== KK_PERSONA)
    penerima.push({
      id: acak.id('kpm'), desaId: o.desa.id, programId: p.id, keluargaId: k.id, nomorKk: k.nomorKk, dusunId: k.dusunId, rw: k.rw, rt: k.rt,
      atasNama: { pendudukId: atasNama.id, nama: atasNama.nama }, desil: desilKk(k.id),
      penyaluran: perluDitinjau ? tahanPenyaluran(salur) : salur, perluDitinjau,
    })
  }

  const calon = kkDesa.filter((k) => k.anggotaIds.length > 0 && indeks.get(k.kepalaKeluargaId)?.statusDasar === 'Hidup')
  const persona = calon.find((k) => k.id === KK_PERSONA)
  if (!persona) throw new Error('Keluarga persona Siti Rahmah tidak ada')
  const wafat = o.mutasi.find((m) => m.desaId === o.desa.id && m.jenis === 'meninggal' && m.tanggal.startsWith(hariIni.slice(0, 7)))
  const almarhum = wafat ? indeks.get(wafat.pendudukIds[0]) : undefined
  const kkAlmarhum = almarhum ? kkDesa.find((k) => k.id === almarhum.keluargaId) : undefined

  const tetap = new Set([KK_PERSONA, kkAlmarhum?.id])
  const acakan = acak.acakUrutan(calon.filter((k) => !tetap.has(k.id)))
  const kkPkh = acakan.slice(0, jumlahPkh)
  const sisa = acakan.slice(jumlahPkh)

  if (wafat && almarhum && kkAlmarhum) {
    tambah(blt, kkAlmarhum, almarhum, { alasan: `Penerima meninggal dunia pada ${formatTanggal(wafat.tanggal)}`, sejak: wafat.dicatatPada })
  }
  for (const k of [persona, ...sisa.slice(0, jumlahBlt - 1 - penerima.length)]) tambah(blt, k, kepala(k), null)
  for (const k of kkPkh) tambah(pkh, k, pengurusPkh(k), null)
  const kkPangan = [persona, ...acak.acakUrutan(calon.filter((k) => k.id !== KK_PERSONA)).slice(0, jumlahPangan - 1)]
  for (const k of kkPangan) tambah(pangan, k, kepala(k), null)
  return { program, penerima }
}
