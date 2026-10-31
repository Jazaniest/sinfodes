import { hitungUmur, waktuIsoWib } from '@sinfodes/kontrak/format/tanggal'
import { dilayani, periksaIsian, saringIsian } from '@sinfodes/kontrak/surat/jenis'
import { periksaPemohon } from '@sinfodes/kontrak/surat/pemohon'
import {
  calonUntuk, kirimPermohonanWargaSchema, MAKS_PENGAJUAN_MENUNGGU, namaSyarat, nomorTiket, PESAN_PENGAJUAN_PENUH, pesanLayananDitutup, syaratWajib,
  type HasilKirimPermohonan,
} from '@sinfodes/kontrak/warga/ajukan'
import { periksaFotoKirim, ukuranKb } from '@sinfodes/kontrak/warga/foto'
import type { Desa } from '@sinfodes/kontrak/wilayah/schema'
import { randomUUID } from 'node:crypto'
import { bersihkanMetadata } from '../../berkas/bersihkan'
import { simpanBerkas } from '../../berkas/layanan'
import { GalatBerkas, periksaBerkas, type TipeBerkas } from '../../berkas/periksa'
import type { Db } from '../../basisdata/klien'
import { GalatApp } from '../../galat'
import { galatField, galatIsian } from '../../galat-isian'
import { denganIdempotensi, type Rujukan } from '../../idempotensi/idempotensi'
import type { Penyandi } from '../../kripto/penyandi'
import { bacaJenisSatu } from '../jenis-surat/repositori'
import { bacaAnggotaHidup } from '../keluarga/repositori'
import { jsonKanonik } from '../permohonan/dokumen'
import type { EfekSurat } from '../permohonan/efek-surat'
import { galatIsianSurat } from '../permohonan/layanan-tulis'
import { bacaPermohonanSatu, hitungMenungguWarga } from '../permohonan/repositori'
import { kunciPengajuanWarga } from '../permohonan/repositori-tulis'
import { PESAN_JENIS_TIDAK_TERSEDIA, sisipkanPermohonanBaru } from '../permohonan/sisip-baru'
import { bentukPenduduk } from '../penduduk/layanan'
import { bacaPendudukSatu } from '../penduduk/repositori'

export const JALUR_IDEMPOTENSI_AJUKAN = 'warga/permohonan'
const PESAN_TIDAK_ONLINE = 'Jenis surat ini tidak bisa diajukan online. Datang ke kantor desa.'
const PESAN_BUKAN_KELUARGA = 'Pilih anggota keluarga Anda sendiri.'
const PESAN_DATA_WARGA_TIDAK_UTUH = 'Data warga tidak lengkap.'
export const PESAN_ISI_PENGAJUAN_TIDAK_TERBACA = 'Isi pengajuan tidak bisa dibaca.'
const PESAN_SYARAT_TIDAK_DIKENAL = 'Syarat foto tidak dikenal untuk jenis surat ini.'
const PANJANG_NAMA_BERKAS = 60

export type KonteksAjukan = { db: Db; penyandi: Penyandi; desa: Desa; pendudukId: string; sekarang: Date; efek: EfekSurat }
/** Isi kiriman multipart: bagian `data` (sudah di-parse JSON, atau null bila rusak) dan berkas `lampiran` berurutan. */
export type KirimanAjukan = { data: unknown; berkas: readonly File[] }

type FotoSiap = { tipe: TipeBerkas; bita: Buffer; ekstensi: string }

/** Nama lampiran dibuat server dari nama syarat (tidak pernah dari nama berkas kiriman): huruf kecil, tanpa aksen, dipisah "-". */
function namaLampiran(syarat: string, ekstensi: string, terpakai: Set<string>): string {
  const dasar = namaSyarat(syarat).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, PANJANG_NAMA_BERKAS)
  const slug = dasar === '' ? 'foto' : dasar
  let nama = `${slug}${ekstensi}`
  for (let n = 2; terpakai.has(nama); n++) nama = `${slug}-${n}${ekstensi}`
  terpakai.add(nama)
  return nama
}

/** Setiap foto diperiksa dari byte (bukan dari tipe kiriman), lalu metadatanya dibuang. Semua selesai sebelum ada tulis apa pun. */
async function siapkanFoto(berkas: readonly File[]): Promise<FotoSiap[]> {
  const siap: FotoSiap[] = []
  for (const f of berkas) {
    // Ukuran dari kontrak dipakai lebih dulu supaya foto raksasa tidak dibaca ke memori hanya untuk ditolak.
    const terlaluBesar = periksaFotoKirim({ type: 'image/jpeg', size: f.size })
    if (terlaluBesar) throw galatField('lampiran', terlaluBesar)
    const mentah = Buffer.from(await f.arrayBuffer())
    try {
      const { tipe, ekstensi } = periksaBerkas(mentah, 'foto')
      siap.push({ tipe, ekstensi, bita: bersihkanMetadata(mentah, tipe) })
    } catch (e) {
      if (e instanceof GalatBerkas) throw galatField('lampiran', e.message)
      throw e
    }
  }
  return siap
}

/**
 * Pengajuan surat oleh warga (SPEC §10, rencana 8F3 Ruling 11). Urutan pemeriksaan sama dengan API tiruan: layanan ditutup,
 * isian kiriman, kunci kirim, jenis, anggota keluarga, isian surat, lalu foto (jumlah, isi, syarat wajib). Semua pemeriksaan
 * selesai sebelum ada tulis; urutan kunci tetap: kunci kirim, jenis (FOR SHARE), kunci pengajuan warga, nomor urut. Wajib dalam
 * transaksi permintaan: galat apa pun membatalkan permohonan, riwayat, aktivitas, berkas, dan kunci kirimnya sekaligus.
 */
export async function ajukanSuratWarga(k: KonteksAjukan, kiriman: KirimanAjukan): Promise<HasilKirimPermohonan & { diulang: boolean }> {
  const masukan = kirimPermohonanWargaSchema.safeParse(kiriman.data)
  if (!masukan.success) throw galatIsian(masukan.error)
  const m = masukan.data

  const { hasil, diulang } = await denganIdempotensi<HasilKirimPermohonan>(
    { db: k.db, pelakuId: k.pendudukId, desaId: k.desa.id, sekarang: k.sekarang },
    {
      kunci: m.kunci,
      jalur: JALUR_IDEMPOTENSI_AJUKAN,
      // Sidik hanya atas `data`: kirim ulang dengan foto yang sama atau berbeda tetap satu pengajuan.
      isi: jsonKanonik(m),
      jalankan: async () => {
        const jenis = await bacaJenisSatu(k.db, m.jenisId, { bagi: true })
        if (!jenis) throw galatField('jenisId', PESAN_TIDAK_ONLINE)
        if (!dilayani(jenis)) throw galatField('jenisId', PESAN_JENIS_TIDAK_TERSEDIA, 'CONFLICT')
        if (!jenis.online) throw galatField('jenisId', PESAN_TIDAK_ONLINE)

        const diri = await bacaPendudukSatu(k.db, k.pendudukId, null)
        if (!diri) throw new GalatApp('SERVER', PESAN_DATA_WARGA_TIDAK_UTUH, 500)
        // Hanya untuk anggota KK sendiri yang masih hidup.
        const anggota = await bacaAnggotaHidup(k.db, diri.keluargaId, null)
        const untuk = anggota.find((a) => a.id === m.untukId)
        if (!untuk) throw galatField('untukId', PESAN_BUKAN_KELUARGA)
        const calon = calonUntuk(jenis.subjek, anggota.map((a) => ({ id: a.id, umurBulan: hitungUmur(a.tanggalLahir, k.sekarang).bulan })))
        if (!calon.some((c) => c.id === untuk.id)) {
          throw galatField(
            'untukId',
            jenis.subjek === 'kelahiran' ? 'Surat kelahiran hanya untuk bayi di bawah 12 bulan.' : 'Surat ini tidak bisa diajukan untuk anggota tersebut.',
          )
        }
        const orangUntuk = bentukPenduduk(untuk, k.penyandi)
        const orangDiri = bentukPenduduk(diri, k.penyandi)
        const pemohon = jenis.subjek === 'pemohon' ? orangUntuk : orangDiri
        const subjek = jenis.subjek === 'pemohon' ? null : orangUntuk
        const cek = periksaPemohon(jenis, pemohon, subjek, null)
        if (cek.blokir) throw galatField('untukId', cek.blokir.pesan)

        const isian = saringIsian(jenis, m.isian)
        const galat = periksaIsian(jenis, isian)
        if (Object.keys(galat).length > 0) throw galatIsianSurat(galat)

        if (kiriman.berkas.length !== m.lampiran.length) throw galatField('lampiran', 'Jumlah foto tidak cocok dengan daftar syarat.')
        const foto = await siapkanFoto(kiriman.berkas)
        if (m.lampiran.some((l) => !jenis.syarat.includes(l.syarat))) throw galatField('lampiran', PESAN_SYARAT_TIDAK_DIKENAL)
        const kurang = jenis.syarat.filter((s) => syaratWajib(s) && !m.lampiran.some((l) => l.syarat === s))
        if (kurang.length > 0) throw galatField('lampiran', `Foto ${kurang.map(namaSyarat).join(', ')} wajib dilampirkan.`)

        // Batas pengajuan Menunggu per warga, dihitung dan disisipkan di bawah kunci yang sama.
        await kunciPengajuanWarga(k.db, k.desa.id, k.pendudukId)
        if ((await hitungMenungguWarga(k.db, k.pendudukId)) >= MAKS_PENGAJUAN_MENUNGGU) throw new GalatApp('CONFLICT', PESAN_PENGAJUAN_PENUH, 409)

        const terpakai = new Set<string>()
        const lampiran = m.lampiran.map((l, i) => ({
          id: `lmp_${randomUUID()}`, syarat: l.syarat, berkas: namaLampiran(l.syarat, foto[i].ekstensi, terpakai), ukuranKb: ukuranKb(foto[i].bita.length),
        }))
        const { id, noUrut } = await sisipkanPermohonanBaru(
          { db: k.db, penyandi: k.penyandi, desaId: k.desa.id, sekarang: k.sekarang },
          {
            jenis,
            pemohon: { id: pemohon.id, nama: pemohon.nama, dusunId: pemohon.dusunId },
            subjekId: subjek?.id ?? null,
            mutasiId: null,
            isian,
            kanal: 'online',
            status: 'menunggu',
            tahap: null,
            lampiran,
            riwayat: ['diajukan'],
            oleh: { id: diri.id, nama: diri.nama },
            ringkasanAktivitas: `Permohonan ${jenis.kode} · ${pemohon.nama} (online)`,
          },
        )
        for (const [i, f] of foto.entries()) {
          await simpanBerkas(k.db, k.penyandi, {
            desaId: k.desa.id, jenis: 'lampiran', permohonanId: id, tipe: f.tipe, bita: f.bita, sekarang: k.sekarang, id: lampiran[i].id,
          })
        }
        await k.efek.permohonanMasukDariWarga(
          k.db, { id, desaId: k.desa.id, dusunId: pemohon.dusunId }, { id: jenis.id, kode: jenis.kode }, { id: pemohon.id, nama: pemohon.nama },
        )
        return { hasil: { id, tiket: nomorTiket({ masukPada: waktuIsoWib(k.sekarang), noUrut }) }, rujukan: { permohonanId: id } }
      },
      pulihkan: async (rujukan: Rujukan) => {
        // Sidik isi memuat jalur, jadi kunci ini tidak mungkin menunjuk mutasi; bila terjadi, perlakukan seperti kunci bentrok.
        const rekam = 'permohonanId' in rujukan ? await bacaPermohonanSatu(k.db, rujukan.permohonanId, null) : undefined
        if (!rekam) throw new GalatApp('CONFLICT', 'Kunci idempotensi ini sudah dipakai untuk isian yang berbeda.', 409)
        return { id: rekam.id, tiket: nomorTiket({ masukPada: waktuIsoWib(rekam.masukPada), noUrut: rekam.noUrut }) }
      },
    },
  )
  return { ...hasil, diulang }
}

/** Menolak pengajuan baru selama desa Ditangguhkan (SPEC-V0.2 §10.5); membaca tetap boleh. Dipanggil sebelum badan dibaca. */
export function tolakBilaLayananDitutup(desa: Pick<Desa, 'nama' | 'status'>): void {
  if (desa.status === 'Ditangguhkan') throw new GalatApp('FORBIDDEN', pesanLayananDitutup(desa.nama), 403)
}
