import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { galatSchema } from '@sinfodes/kontrak/api'
import { hasilMutasiSchema, type AnggotaDatang, type MasukanDatang, type MasukanLahir, type MasukanMeninggal } from '@sinfodes/kontrak/mutasi/masukan'
import { buatNik } from '@sinfodes/kontrak/penduduk/nik'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { kirimJson, masukLewatRute, rakitApp } from '../../test/rakit-app'

const SS = 'http://sungaisialang.sinfodes.localhost'

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
let kuki: Record<'operator' | 'sekdes' | 'kades', string>
beforeAll(async () => {
  uji = await buatDbUji()
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  const masuk = async (email: string, ip: string) => (await masukLewatRute(app, SS, email, 'demo', ip)).kuki as string
  kuki = {
    operator: await masuk('rosmiati@sungaisialang.desa.id', '10.1.0.1'),
    sekdes: await masuk('hendri@sungaisialang.desa.id', '10.1.0.2'),
    kades: await masuk('kades@sungaisialang.desa.id', '10.1.0.3'),
  }
})
afterAll(async () => {
  await uji?.tutup()
})

const kunciBaru = (() => {
  let n = 0
  return (awalan = 'kunci-uji'): string => `${awalan}-${String(++n).padStart(4, '0')}`
})()
const kirim = async (jenis: string, badan: unknown, kunci: string | undefined, k: string | null = kuki.operator): Promise<Response> =>
  kirimJson(app, SS, `/api/v1/mutasi/${jenis}`, badan, k, kunci === undefined ? {} : { 'Idempotency-Key': kunci })
const galat = async (r: Response) => galatSchema.parse(await r.json()).error
const hitung = async (tabel: string, kondisi = 'true'): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel} where ${kondisi}`))[0].n)
const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms))

const lahir = (nama: string, ibuId = 'pdk_siti_rahmah'): MasukanLahir => ({
  ibuId, ayahId: null, pelapor: 'Pelapor',
  bayi: { nama, jenisKelamin: 'P', tempatLahir: 'Pelalawan', tanggalLahir: '2026-09-20', jam: '04:15', tempatDilahirkan: 'Puskesmas', jenisKelahiran: 'Tunggal', anakKe: 3, penolong: 'Bidan/Perawat', beratGram: 3100, panjangCm: 49 },
})
let urutNik = 9300
function anggota(ubah: Partial<AnggotaDatang> = {}): AnggotaDatang {
  return {
    nik: buatNik({ kodeWilayah: '331001', tanggalLahir: '1988-05-12', jenisKelamin: 'L', nomorUrut: urutNik++ }), nama: 'Sutrisno', jenisKelamin: 'L', golonganDarah: 'Tidak Tahu',
    agama: 'Islam', kewarganegaraan: 'WNI', tempatLahir: 'Klaten', tanggalLahir: '1988-05-12', nomorAktaLahir: null, hubunganKeluarga: 'Kepala Keluarga', namaAyah: '', namaIbu: '',
    pendidikan: 'SLTA/Sederajat', pekerjaan: 'Wiraswasta', statusPerkawinan: 'Kawin Tercatat', ktpEl: 'Sudah rekam', telepon: null, catatan: null, ...ubah,
  }
}
const datang = (ubah: Partial<MasukanDatang> = {}): MasukanDatang => ({
  nomorSkpwni: '3310/SKPWNI/2026/0099', asal: { provinsi: 'Jawa Tengah', kabupaten: 'Klaten', kecamatan: 'Wedi', desa: 'Pandes', alamat: '' }, tanggal: '2026-09-22',
  keluarga: { jenis: 'baru', dusunId: 'dsn_ss_3', rw: '005', rt: '012' }, statusPenduduk: 'Tetap', anggota: [anggota()], ...ubah,
})
const meninggal = (pendudukId: string, penggantiKepalaId: string | null = null): MasukanMeninggal => ({
  pendudukId, tanggal: '2026-09-23', jam: '21:40', tempat: 'Rumah', sebab: 'Sakit biasa/tua', yangMenerangkan: 'Tenaga kesehatan', pelapor: 'Pelapor', penggantiKepalaId,
})

describe('Idempotency-Key pada POST /mutasi/* (SPEC-V0.3 §5.4 butir 4, rencana 8E2 Ruling 1)', () => {
  it('tanpa header perilaku biasa; kunci yang formatnya salah ditolak 422 sebelum menulis apa pun', async () => {
    const sebelum = await hitung('mutasi')
    for (const kunci of ['pendek', 'ada spasi di dalam kunci ini', 'a'.repeat(65), 'karakter-aneh-!@#$%^']) {
      const r = await kirim('lahir', lahir('Bayi Kunci Salah'), kunci)
      expect(r.status, kunci).toBe(422)
      expect((await galat(r)).message).toBe('Kunci idempotensi tidak valid.')
    }
    expect(await hitung('mutasi')).toBe(sebelum)
    expect((await kirim('lahir', lahir('Bayi Tanpa Kunci'), undefined)).status).toBe(201)
    expect((await kirim('lahir', lahir('Bayi Tanpa Kunci'), undefined)).status).toBe(201)
    expect(await hitung('penduduk', `nama = 'Bayi Tanpa Kunci'`)).toBe(2)
  })

  it('kirim ulang berurutan dengan kunci yang sama: satu bayi, jawaban sama, ditandai Idempotency-Replayed', async () => {
    const kunci = kunciBaru()
    const sebelum = await hitung('mutasi')
    const a = await kirim('lahir', lahir('Bayi Ulang'), kunci)
    const b = await kirim('lahir', lahir('Bayi Ulang'), kunci)
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect(a.headers.get('Idempotency-Replayed')).toBeNull()
    expect(b.headers.get('Idempotency-Replayed')).toBe('true')
    expect(await b.json()).toEqual(await a.json())
    expect(await hitung('penduduk', `nama = 'Bayi Ulang'`)).toBe(1)
    expect(await hitung('mutasi')).toBe(sebelum + 1)
  })

  it('kedatangan: jawaban ulang dibentuk dari mutasi tersimpan (NIK utuh) tanpa KK atau penduduk ganda', async () => {
    const kunci = kunciBaru()
    const masukan = datang({ anggota: [anggota({ nama: 'Pendatang Ulang' })] })
    const kkSebelum = await hitung('keluarga')
    const a = await kirim('datang', masukan, kunci)
    const b = await kirim('datang', masukan, kunci)
    expect([a.status, b.status]).toEqual([201, 201])
    const hasilA = hasilMutasiSchema.parse(await a.json())
    expect(hasilMutasiSchema.parse(await b.json())).toEqual(hasilA)
    expect(hasilA.penduduk[0].nik).toBe(masukan.anggota[0].nik)
    expect(await hitung('keluarga')).toBe(kkSebelum + 1)
    expect(await hitung('penduduk', `nama = 'Pendatang Ulang'`)).toBe(1)
  })

  it('meninggal dikirim ulang: satu mutasi, jawaban ulang memuat status Meninggal', async () => {
    const kunci = kunciBaru()
    const [b] = await uji.sqlMigrasi`select id from penduduk where id = 'pdk_muhammad_alif'`
    const a1 = await kirim('meninggal', meninggal(b.id as string), kunci)
    const a2 = await kirim('meninggal', meninggal(b.id as string), kunci)
    expect([a1.status, a2.status]).toEqual([201, 201])
    expect(a2.headers.get('Idempotency-Replayed')).toBe('true')
    expect(hasilMutasiSchema.parse(await a2.json()).penduduk[0].statusDasar).toBe('Meninggal')
    expect(await hitung('mutasi_penduduk', `penduduk_id = 'pdk_muhammad_alif' and mutasi_id in (select id from mutasi where jenis = 'meninggal')`)).toBe(1)
  })

  it('kunci yang sama dengan isian atau jalur berbeda: 409, tidak ada mutasi baru', async () => {
    const kunci = kunciBaru()
    expect((await kirim('lahir', lahir('Bayi Asli'), kunci)).status).toBe(201)
    const sebelum = await hitung('mutasi')
    const beda = await kirim('lahir', lahir('Bayi Lain'), kunci)
    expect(beda.status).toBe(409)
    expect(await galat(beda)).toMatchObject({ code: 'CONFLICT', message: 'Kunci idempotensi ini sudah dipakai untuk isian yang berbeda.' })
    const jalur = await kirim('meninggal', meninggal('pdk_nur_aini'), kunci)
    expect(jalur.status).toBe(409)
    expect(await hitung('mutasi')).toBe(sebelum)
    expect(await hitung('penduduk', `nama = 'Bayi Lain'`)).toBe(0)
  })

  it('permintaan pertama yang ditolak tidak menyimpan kunci: isian yang diperbaiki dengan kunci sama diproses', async () => {
    const kunci = kunciBaru()
    const salah = await kirim('lahir', lahir('Bayi Diperbaiki', 'pdk_syahrial'), kunci)
    expect(salah.status).toBe(422)
    expect(await hitung('kunci_idempotensi', `kunci = '${kunci}'`)).toBe(0)
    const benar = await kirim('lahir', lahir('Bayi Diperbaiki'), kunci)
    expect(benar.status).toBe(201)
    expect(benar.headers.get('Idempotency-Replayed')).toBeNull()
    expect(await hitung('kunci_idempotensi', `kunci = '${kunci}'`)).toBe(1)
  })

  it('kegagalan server di tengah penulisan membatalkan kunci juga; kirim ulang diproses', async () => {
    const kunci = kunciBaru()
    await uji.sqlMigrasi.unsafe(`create function uji_gagal_aktivitas5() returns trigger language plpgsql as $$ begin raise exception 'uji gagal'; end $$`)
    await uji.sqlMigrasi.unsafe('grant execute on function uji_gagal_aktivitas5() to public')
    await uji.sqlMigrasi.unsafe('create trigger uji_gagal5 before insert on aktivitas for each row execute function uji_gagal_aktivitas5()')
    try {
      expect((await kirim('lahir', lahir('Bayi Setelah Gagal'), kunci)).status).toBe(500)
    } finally {
      await uji.sqlMigrasi.unsafe('drop trigger uji_gagal5 on aktivitas')
      await uji.sqlMigrasi.unsafe('drop function uji_gagal_aktivitas5()')
    }
    expect(await hitung('kunci_idempotensi', `kunci = '${kunci}'`)).toBe(0)
    expect((await kirim('lahir', lahir('Bayi Setelah Gagal'), kunci)).status).toBe(201)
    expect(await hitung('penduduk', `nama = 'Bayi Setelah Gagal'`)).toBe(1)
  })

  it('kunci dibatasi per pengguna: dua petugas dengan kunci yang sama masing-masing diproses', async () => {
    const kunci = kunciBaru()
    const a = await kirim('lahir', lahir('Bayi Dua Petugas'), kunci, kuki.operator)
    const b = await kirim('lahir', lahir('Bayi Dua Petugas'), kunci, kuki.sekdes)
    expect([a.status, b.status]).toEqual([201, 201])
    expect(b.headers.get('Idempotency-Replayed')).toBeNull()
    expect(await hitung('penduduk', `nama = 'Bayi Dua Petugas'`)).toBe(2)
  })

  it('dua permintaan serentak dengan kunci sama: yang kedua menunggu yang pertama lalu mendapat jawaban yang sama, satu KK baru (bukti deterministik)', async () => {
    const kunci = kunciBaru()
    const masukan = datang({ anggota: [anggota({ nama: 'Pendatang Serentak' })] })
    const kkSebelum = await hitung('keluarga')
    let selesai = 0
    let jawaban: Promise<Response[]> | undefined
    await uji.sqlMigrasi.begin(async (tx) => {
      // Kunci nomor KK ditahan: permintaan pertama sudah memesan kunci idempotensi lalu antre, yang kedua menunggu pemesanan itu.
      await tx`select pg_advisory_xact_lock(hashtextextended(${`nomor-kk:${ID_SUNGAI_SIALANG}`}, 0))`
      const pertama = kirim('datang', masukan, kunci).then((r) => (selesai++, r))
      await tunggu(300)
      const kedua = kirim('datang', masukan, kunci).then((r) => (selesai++, r))
      jawaban = Promise.all([pertama, kedua])
      await tunggu(500)
      expect(selesai).toBe(0)
    })
    const [x, y] = (await jawaban) as Response[]
    expect([x.status, y.status]).toEqual([201, 201])
    expect(x.headers.get('Idempotency-Replayed')).toBeNull()
    expect(y.headers.get('Idempotency-Replayed')).toBe('true')
    expect(await y.json()).toEqual(await x.json())
    expect(await hitung('keluarga')).toBe(kkSebelum + 1)
    expect(await hitung('penduduk', `nama = 'Pendatang Serentak'`)).toBe(1)
  })

  it('tabel hanya menyimpan sidik isi dan id mutasi: tidak ada NIK atau salinan jawaban', async () => {
    const kunci = kunciBaru()
    const masukan = datang({ anggota: [anggota({ nama: 'Pendatang Rahasia' })] })
    const r = await kirim('datang', masukan, kunci)
    const { mutasi } = hasilMutasiSchema.parse(await r.json())
    const [baris] = await uji.sqlMigrasi`select desa_id, pengguna_id, kunci, jalur, sidik_isi, mutasi_id from kunci_idempotensi where kunci = ${kunci}`
    expect(baris).toMatchObject({ desa_id: ID_SUNGAI_SIALANG, pengguna_id: 'pgn_rosmiati', kunci, jalur: 'mutasi/datang', mutasi_id: mutasi.id })
    expect(baris.sidik_isi).toMatch(/^[0-9a-f]{64}$/)
    const [teks] = await uji.sqlMigrasi`select string_agg(k::text, E'\n') as t from kunci_idempotensi k`
    expect((teks.t as string).includes(masukan.anggota[0].nik)).toBe(false)
    expect((teks.t as string).includes('Pendatang Rahasia')).toBe(false)
  })

  it('peran tanpa hak ubah tetap 403 dan tidak menyimpan kunci', async () => {
    const kunci = kunciBaru()
    const r = await kirim('lahir', lahir('Bayi Kades'), kunci, kuki.kades)
    expect(r.status).toBe(403)
    expect(await hitung('kunci_idempotensi', `kunci = '${kunci}'`)).toBe(0)
  })
})

describe('tabel kunci_idempotensi', () => {
  it('desa-privat: desa hanya SELECT, INSERT, dan UPDATE kolom mutasi_id; peran lain tanpa hak', async () => {
    const punya = async (peran: string, hak: string) => (await uji.sqlMigrasi`select has_table_privilege(${peran}, 'kunci_idempotensi', ${hak}) as ada`)[0].ada as boolean
    expect(await punya('sinfodes_desa', 'SELECT')).toBe(true)
    expect(await punya('sinfodes_desa', 'INSERT')).toBe(true)
    expect(await punya('sinfodes_desa', 'UPDATE')).toBe(false)
    expect(await punya('sinfodes_desa', 'DELETE')).toBe(false)
    const kolom = (await uji.sqlMigrasi`select column_name from information_schema.columns where table_name = 'kunci_idempotensi'`).map((b) => b.column_name as string)
    for (const k of kolom) {
      const [b] = await uji.sqlMigrasi`select has_column_privilege('sinfodes_desa', 'kunci_idempotensi', ${k}, 'UPDATE') as ada`
      expect(b.ada, k).toBe(k === 'mutasi_id')
    }
    for (const peran of ['sinfodes_kabupaten', 'sinfodes_konsol', 'sinfodes_publik']) {
      for (const hak of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) expect(await punya(peran, hak), `${peran} ${hak}`).toBe(false)
    }
  })
})
