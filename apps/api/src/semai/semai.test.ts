import { ID_SUNGAI_SIALANG, KATA_SANDI_DEMO } from '@sinfodes/demo/data/desa-demo'
import { bangkitkanDb } from '@sinfodes/demo/generator'
import type { DbDemo } from '@sinfodes/demo/tipe-db'
import { SEKARANG_UJI } from '@sinfodes/demo/uji-akun'
import { jenisSuratSchema } from '@sinfodes/kontrak/surat/jenis'
import { tataLetakSuratSchema } from '@sinfodes/kontrak/surat/tata-letak'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { periksaKataSandi } from '../kripto/kata-sandi'
import { ruang } from '../kripto/ruang'
import type { Penyandi } from '../kripto/penyandi'
import { buatDbUji, penyandiUji, type DbUji } from '../../test/basisdata'
import { buatAkunKonsolUji } from '../../test/akun-uji'
import { KID_UJI, KUNCI_UTAMA_UJI } from '../../test/env-uji'
import { GalatSemai, pastikanKunciData, semaiDunia } from './semai'

let uji: DbUji
let penyandi: Penyandi
let dunia: DbDemo
beforeAll(async () => {
  uji = await buatDbUji()
  penyandi = await penyandiUji(uji.sqlMigrasi)
  dunia = bangkitkanDb(SEKARANG_UJI)
})
afterAll(async () => {
  await uji?.tutup()
})

const hitung = async (tabel: string): Promise<number> => Number((await uji.sqlMigrasi.unsafe(`select count(*)::int as n from ${tabel}`))[0].n)
const opsiUji = () => ({ lingkungan: 'uji' as const, dunia })

describe('semai dari dunia demo (rencana 8C Tugas 6)', () => {
  it('jumlah baris sama dengan dunia demo, 2.812 jiwa dan 806 KK untuk Sungai Sialang', async () => {
    expect(await hitung('desa')).toBe(dunia.desa.length)
    expect(await hitung('alias_alamat')).toBe(dunia.aliasAlamat.length)
    expect(await hitung('dusun')).toBe(dunia.dusun.length)
    expect(await hitung('pengguna')).toBe(dunia.pengguna.length)
    expect(await hitung('keluarga')).toBe(dunia.keluarga.length)
    expect(await hitung('penduduk')).toBe(dunia.penduduk.length)
    const [jiwa] = await uji.sqlMigrasi`select count(*)::int as n from penduduk where desa_id = ${ID_SUNGAI_SIALANG} and status_dasar = 'Hidup'`
    expect(jiwa.n).toBe(2812)
    const [kk] = await uji.sqlMigrasi`select count(distinct keluarga_id)::int as n from penduduk where desa_id = ${ID_SUNGAI_SIALANG} and status_dasar = 'Hidup'`
    expect(kk.n).toBe(806)
  })

  it('ID demo yang terbaca dipertahankan dan identitas desa terpetakan', async () => {
    const [pengguna] = await uji.sqlMigrasi`select desa_id, peran, email from pengguna where id = 'pgn_hendri'`
    expect(pengguna).toMatchObject({ desa_id: ID_SUNGAI_SIALANG, peran: 'sekdes', email: 'hendri@sungaisialang.desa.id' })
    const [warga] = await uji.sqlMigrasi`select desa_id, nama from penduduk where id = 'pdk_siti_rahmah'`
    expect(warga.desa_id).toBe(ID_SUNGAI_SIALANG)
    const [desa] = await uji.sqlMigrasi`select slug, status, kecamatan_nama, warna_aksen, modul, tampilan_warga from desa where id = ${ID_SUNGAI_SIALANG}`
    expect(desa).toMatchObject({ slug: 'sungaisialang', status: 'Aktif', kecamatan_nama: 'Teluk Meranti', modul: { kesehatan: true } })
    expect(desa.warna_aksen).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(desa.tampilan_warga).toHaveProperty('warnaUtama')
    const [persiapan] = await uji.sqlMigrasi`select tampilan_warga, modul from desa where id = 'desa_tanjung_lamo'`
    expect(persiapan.tampilan_warga).toBeNull()
    expect(persiapan.modul).toEqual({ kesehatan: false })
  })

  it('NIK, nomor KK, dan telepon tidak ada polos di basis data', async () => {
    const warga = dunia.penduduk.filter((p) => p.nik && p.telepon).slice(0, 60)
    expect(warga.length).toBeGreaterThan(20)
    const [{ teks }] = await uji.sqlMigrasi`select string_agg(p::text, E'\n') as teks from penduduk p`
    for (const p of warga) {
      expect(teks.includes(p.nik as string), `NIK ${p.id}`).toBe(false)
      expect(teks.includes(p.telepon as string), `telepon ${p.id}`).toBe(false)
    }
    const [{ teksKk }] = await uji.sqlMigrasi`select string_agg(k::text, E'\n') as "teksKk" from keluarga k`
    for (const k of dunia.keluarga.slice(0, 60)) expect(teksKk.includes(k.nomorKk), `KK ${k.id}`).toBe(false)
    const [bentuk] = await uji.sqlMigrasi`select nik_sandi, telepon_sandi from penduduk where id = ${warga[0].id}`
    expect(bentuk.nik_sandi).toMatch(new RegExp(`^v1\\.${KID_UJI}\\.`))
    expect(bentuk.telepon_sandi).toMatch(new RegExp(`^v1\\.${KID_UJI}\\.`))
  })

  it('buka sandi mengembalikan nilai asli', async () => {
    const warga = dunia.penduduk.filter((p) => p.nik && p.telepon).slice(0, 25)
    for (const p of warga) {
      const [b] = await uji.sqlMigrasi`select nik_sandi, telepon_sandi from penduduk where id = ${p.id}`
      expect(penyandi.bukaSandi(b.nik_sandi, `penduduk.nik:${p.desaId}`)).toBe(p.nik)
      expect(penyandi.bukaSandi(b.telepon_sandi, `penduduk.telepon:${p.desaId}`)).toBe(p.telepon)
    }
    for (const k of dunia.keluarga.slice(0, 25)) {
      const [b] = await uji.sqlMigrasi`select nomor_kk_sandi from keluarga where id = ${k.id}`
      expect(penyandi.bukaSandi(b.nomor_kk_sandi, `keluarga.nomorKk:${k.desaId}`)).toBe(k.nomorKk)
    }
    const tanpaNik = dunia.penduduk.find((p) => p.nik === null)
    if (tanpaNik) {
      const [b] = await uji.sqlMigrasi`select nik_sandi, nik_indeks from penduduk where id = ${tanpaNik.id}`
      expect(b).toMatchObject({ nik_sandi: null, nik_indeks: null })
    }
  })

  it('indeks NIK dan nomor KK unik per desa dan cocok dengan penyandi', async () => {
    const gandaNik = await uji.sqlMigrasi`select desa_id, nik_indeks from penduduk where nik_indeks is not null group by 1, 2 having count(*) > 1`
    expect(gandaNik).toHaveLength(0)
    const gandaKk = await uji.sqlMigrasi`select desa_id, nomor_kk_indeks from keluarga group by 1, 2 having count(*) > 1`
    expect(gandaKk).toHaveLength(0)
    const p = dunia.penduduk.find((x) => x.nik) as NonNullable<DbDemo['penduduk'][number]>
    const [b] = await uji.sqlMigrasi`select nik_indeks from penduduk where id = ${p.id}`
    expect(b.nik_indeks).toBe(penyandi.indeks(p.nik as string, `penduduk.nik:${p.desaId}`))
    const k = dunia.keluarga[0]
    const [bk] = await uji.sqlMigrasi`select nomor_kk_indeks from keluarga where id = ${k.id}`
    expect(bk.nomor_kk_indeks).toBe(penyandi.indeks(k.nomorKk, `keluarga.nomorKk:${k.desaId}`))
  })

  it('setiap pengguna demo dapat masuk dengan KATA_SANDI_DEMO dan hash-nya argon2id', async () => {
    const baris = await uji.sqlMigrasi`select id, kata_sandi_hash from pengguna`
    expect(baris).toHaveLength(dunia.pengguna.length)
    for (const b of baris) {
      expect(b.kata_sandi_hash, b.id).toMatch(/^\$argon2id\$/)
      expect(await periksaKataSandi(b.kata_sandi_hash, KATA_SANDI_DEMO), b.id).toBe(true)
    }
    expect(await periksaKataSandi(baris[0].kata_sandi_hash, 'bukan-kata-sandinya')).toBe(false)
  })

  it('semai menolak lingkungan produksi dan staging tanpa bendera eksplisit, dan tidak menulis apa pun', async () => {
    const sebelum = await hitung('penduduk')
    for (const lingkungan of ['produksi', 'staging'] as const) {
      await expect(semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, { lingkungan, dunia })).rejects.toThrow(GalatSemai)
    }
    expect(await hitung('penduduk')).toBe(sebelum)
    await expect(semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, { lingkungan: 'staging', izinkanLingkunganNyata: true, dunia })).resolves.toBeTruthy()
  })

  it('semai idempoten: kedua kali tidak menggandakan dan tidak menyandikan ulang', async () => {
    const contoh = dunia.penduduk.find((p) => p.nik) as NonNullable<DbDemo['penduduk'][number]>
    const [sebelum] = await uji.sqlMigrasi`select nik_sandi from penduduk where id = ${contoh.id}`
    const hitungan = [await hitung('desa'), await hitung('dusun'), await hitung('pengguna'), await hitung('keluarga'), await hitung('penduduk')]
    const ringkasan = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    const lagi = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(lagi).toEqual(ringkasan)
    expect([await hitung('desa'), await hitung('dusun'), await hitung('pengguna'), await hitung('keluarga'), await hitung('penduduk')]).toEqual(hitungan)
    const [sesudah] = await uji.sqlMigrasi`select nik_sandi from penduduk where id = ${contoh.id}`
    expect(sesudah.nik_sandi).toBe(sebelum.nik_sandi)
  })

  it('ringkasan hanya berisi angka, tanpa data pribadi', async () => {
    const ringkasan = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(Object.values(ringkasan).every((n) => typeof n === 'number')).toBe(true)
    expect(JSON.stringify(ringkasan)).not.toMatch(/\d{9,}/)
  })

  it('identitas: jumlah baris akun warga, kabupaten mitra, pengguna kabupaten, dan pengguna Konsol sama dengan dunia demo', async () => {
    expect(dunia.akunWarga.length).toBeGreaterThan(0)
    expect(await hitung('akun_warga')).toBe(dunia.akunWarga.length)
    expect(await hitung('kabupaten_mitra')).toBe(dunia.kabupatenMitra.length)
    expect(await hitung('pengguna_kabupaten')).toBe(dunia.penggunaKabupaten.length)
    expect(await hitung('pengguna_konsol')).toBe(dunia.penggunaKonsol.length)
    const [mitra] = await uji.sqlMigrasi`select nama, label, surat_penunjukan from kabupaten_mitra where label = 'kab-pelalawan'`
    expect(mitra).toMatchObject({ nama: 'Pelalawan' })
    expect(mitra.surat_penunjukan).toHaveProperty('nomor')
  })

  it('identitas: PIN warga di-hash argon2id (bukan polos) dan WhatsApp tersandi serta terbuka kembali', async () => {
    const [{ teks }] = await uji.sqlMigrasi`select string_agg(a::text, E'\n') as teks from akun_warga a`
    for (const a of dunia.akunWarga) {
      const [b] = await uji.sqlMigrasi`select pin_hash, whatsapp_sandi, desa_id from akun_warga where penduduk_id = ${a.pendudukId}`
      expect(b.pin_hash).toMatch(/^\$argon2id\$/)
      expect(await periksaKataSandi(b.pin_hash, a.pin), a.pendudukId).toBe(true)
      expect(await periksaKataSandi(b.pin_hash, '000000'), a.pendudukId).toBe(false)
      expect(teks.includes(a.pin) && teks.includes(`"${a.pin}"`)).toBe(false)
      expect(teks.includes(a.whatsapp), `whatsapp ${a.pendudukId}`).toBe(false)
      expect(penyandi.bukaSandi(b.whatsapp_sandi, ruang.whatsapp(b.desa_id))).toBe(a.whatsapp)
    }
  })

  it('identitas: pengguna kabupaten dan Konsol masuk dengan KATA_SANDI_DEMO; akun Konsol semai tanpa TOTP', async () => {
    for (const tabel of ['pengguna_kabupaten', 'pengguna_konsol']) {
      const baris = await uji.sqlMigrasi.unsafe(`select id, email, kata_sandi_hash from ${tabel}`)
      expect(baris.length, tabel).toBeGreaterThan(0)
      for (const b of baris) {
        expect(b.kata_sandi_hash, b.id).toMatch(/^\$argon2id\$/)
        expect(b.email, b.id).toBe((b.email as string).toLowerCase())
        expect(await periksaKataSandi(b.kata_sandi_hash, KATA_SANDI_DEMO), b.id).toBe(true)
      }
    }
    const [tanpa] = await uji.sqlMigrasi`select count(*)::int as n from pengguna_konsol where totp_rahasia_sandi is not null or totp_langkah_terakhir is not null`
    expect(tanpa.n).toBe(0)
  })

  it('identitas: idempoten, dan buatAkunKonsolUji menyisipkan akun dengan rahasia TOTP tersandi yang dapat dibuka', async () => {
    const sebelum = [await hitung('akun_warga'), await hitung('kabupaten_mitra'), await hitung('pengguna_kabupaten'), await hitung('pengguna_konsol')]
    await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect([await hitung('akun_warga'), await hitung('kabupaten_mitra'), await hitung('pengguna_kabupaten'), await hitung('pengguna_konsol')]).toEqual(sebelum)

    const akun = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: true })
    const [b] = await uji.sqlMigrasi`select totp_rahasia_sandi, kata_sandi_hash from pengguna_konsol where id = ${akun.id}`
    expect(b.totp_rahasia_sandi).toMatch(/^v1\./)
    expect(Buffer.from(penyandi.bukaSandi(b.totp_rahasia_sandi, ruang.totpKonsol), 'base64')).toEqual(akun.rahasia)
    expect(await periksaKataSandi(b.kata_sandi_hash, akun.kataSandi)).toBe(true)
    const tanpaTotp = await buatAkunKonsolUji(uji.sqlMigrasi, penyandi, { totp: false })
    expect(tanpaTotp.rahasia).toBeNull()
    await uji.sqlMigrasi`delete from pengguna_konsol where id in (${akun.id}, ${tanpaTotp.id})`
  })

  it('kunci data aktif disisipkan sekali dan dapat dibuka kembali', async () => {
    const sebelum = await pastikanKunciData(uji.sqlMigrasi, KUNCI_UTAMA_UJI, KID_UJI)
    const sesudah = await pastikanKunciData(uji.sqlMigrasi, KUNCI_UTAMA_UJI, KID_UJI)
    expect(sesudah).toEqual(sebelum)
    expect(sebelum.map((b) => b.kid)).toContain(KID_UJI)
    expect(await hitung('kunci_data')).toBe(sebelum.length)
  })
})

describe('semai kependudukan (rencana 8E1 Tugas 1)', () => {
  it('riwayat penduduk dan aktivitas sama jumlahnya dengan dunia demo, pelaku dipecah menjadi id dan nama', async () => {
    expect(await hitung('riwayat_penduduk')).toBe(dunia.riwayat.length)
    expect(await hitung('aktivitas')).toBe(dunia.aktivitas.length)
    const r = dunia.riwayat.find((x) => x.field !== 'nik' && x.field !== 'telepon') as NonNullable<DbDemo['riwayat'][number]>
    const [b] = await uji.sqlMigrasi`select desa_id, penduduk_id, field, nilai_lama, nilai_baru, oleh_id, oleh_nama, waktu from riwayat_penduduk where id = ${r.id}`
    expect(b).toMatchObject({ desa_id: r.desaId, penduduk_id: r.pendudukId, field: r.field, nilai_lama: r.nilaiLama, nilai_baru: r.nilaiBaru, oleh_id: r.oleh.id, oleh_nama: r.oleh.nama })
    expect((b.waktu as Date).getTime()).toBe(new Date(r.waktu).getTime())
    const a = dunia.aktivitas.find((x) => x.oleh !== null && x.rujukan !== null) as NonNullable<DbDemo['aktivitas'][number]>
    expect(a).toBeDefined()
    const [ba] = await uji.sqlMigrasi`select dusun_id, jenis, ringkasan, oleh_id, oleh_nama, rujukan_jenis, rujukan_id from aktivitas where id = ${a.id}`
    expect(ba).toMatchObject({ dusun_id: a.dusunId, jenis: a.jenis, ringkasan: a.ringkasan, oleh_id: a.oleh?.id, oleh_nama: a.oleh?.nama, rujukan_jenis: a.rujukan?.jenis, rujukan_id: a.rujukan?.id })
  })

  it('riwayat NIK dan telepon tersandi di basis data dan terbuka kembali; tidak ada yang polos (SPEC-V0.3 §7.6)', async () => {
    const sensitif = dunia.riwayat.filter((r) => r.field === 'nik' || r.field === 'telepon')
    expect(sensitif.length).toBeGreaterThan(0)
    const [{ teks }] = await uji.sqlMigrasi`select string_agg(r::text, E'\n') as teks from riwayat_penduduk r where field in ('nik', 'telepon')`
    for (const r of sensitif) {
      for (const nilai of [r.nilaiLama, r.nilaiBaru]) if (nilai) expect(teks.includes(nilai), `${r.id} ${nilai}`).toBe(false)
      const [b] = await uji.sqlMigrasi`select nilai_lama, nilai_baru from riwayat_penduduk where id = ${r.id}`
      for (const [sandi, asli] of [[b.nilai_lama, r.nilaiLama], [b.nilai_baru, r.nilaiBaru]] as const) {
        if (asli === null) expect(sandi).toBeNull()
        else expect(penyandi.bukaSandi(sandi as string, `riwayat_penduduk.nilai:${r.desaId}`)).toBe(asli)
      }
    }
  })

  it('invarian: penduduk Hidup tiap KK menurut urutan_kk sama persis dengan anggotaIds KK itu', async () => {
    const baris = await uji.sqlMigrasi`select keluarga_id, id from penduduk where status_dasar = 'Hidup' order by keluarga_id, urutan_kk, id`
    const perKk = new Map<string, string[]>()
    for (const b of baris) perKk.set(b.keluarga_id as string, [...(perKk.get(b.keluarga_id as string) ?? []), b.id as string])
    for (const k of dunia.keluarga) expect(perKk.get(k.id) ?? [], k.id).toEqual(k.anggotaIds)
    const bukanAnggota = await uji.sqlMigrasi`select count(*)::int as n from penduduk where status_dasar <> 'Hidup' and urutan_kk <> 0`
    expect(bukanAnggota[0].n).toBe(0)
  })

  it('semai kedua memperbaiki urutan_kk yang masih 0 tetapi tidak menimpa urutan yang sudah berubah', async () => {
    const kk = dunia.keluarga.find((k) => k.anggotaIds.length >= 3) as NonNullable<DbDemo['keluarga'][number]>
    const [kedua, ketiga] = [kk.anggotaIds[1], kk.anggotaIds[2]]
    await uji.sqlMigrasi`update penduduk set urutan_kk = 0 where id = ${kedua}`
    await uji.sqlMigrasi`update penduduk set urutan_kk = 77 where id = ${ketiga}`
    await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    const baris = await uji.sqlMigrasi`select id, urutan_kk from penduduk where id in (${kedua}, ${ketiga})`
    expect(Object.fromEntries(baris.map((b) => [b.id, b.urutan_kk]))).toEqual({ [kedua]: 1, [ketiga]: 77 })
    await uji.sqlMigrasi`update penduduk set urutan_kk = 2 where id = ${ketiga}`
  })
})

describe('semai mutasi dan laporan data (rencana 8E2 Tugas 1)', () => {
  it('jumlah baris mutasi, pasangan mutasi-penduduk, dan laporan sama dengan dunia demo; ringkasan memuatnya', async () => {
    expect(dunia.mutasi.length).toBeGreaterThan(0)
    expect(dunia.laporanData.length).toBe(2)
    expect(await hitung('mutasi')).toBe(dunia.mutasi.length)
    expect(await hitung('mutasi_penduduk')).toBe(dunia.mutasi.reduce((n, m) => n + m.pendudukIds.length, 0))
    expect(await hitung('laporan_data')).toBe(dunia.laporanData.length)
    const ringkasan = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(ringkasan).toMatchObject({ mutasi: dunia.mutasi.length, laporanData: dunia.laporanData.length })
  })

  it('invarian: tiap mutasi membentuk kembali objek demo, penduduknya berurut menurut urutan', async () => {
    const baris = await uji.sqlMigrasi`select id, desa_id, jenis, tanggal::text as tanggal, dicatat_oleh_id, dicatat_oleh_nama, dicatat_pada, rincian from mutasi`
    const perId = new Map(baris.map((b) => [b.id as string, b]))
    const pasangan = await uji.sqlMigrasi`select mutasi_id, penduduk_id from mutasi_penduduk order by mutasi_id, urutan`
    const perMutasi = new Map<string, string[]>()
    for (const b of pasangan) perMutasi.set(b.mutasi_id as string, [...(perMutasi.get(b.mutasi_id as string) ?? []), b.penduduk_id as string])
    for (const m of dunia.mutasi) {
      const b = perId.get(m.id)
      expect(b, m.id).toBeDefined()
      expect({ desaId: b?.desa_id, jenis: b?.jenis, tanggal: b?.tanggal, oleh: { id: b?.dicatat_oleh_id, nama: b?.dicatat_oleh_nama }, pada: (b?.dicatat_pada as Date).getTime(), rincian: b?.rincian }, m.id).toEqual({
        desaId: m.desaId, jenis: m.jenis, tanggal: m.tanggal, oleh: m.dicatatOleh, pada: new Date(m.dicatatPada).getTime(), rincian: m.rincian,
      })
      expect(perMutasi.get(m.id), m.id).toEqual(m.pendudukIds)
    }
  })

  it('invarian: tiap laporan membentuk kembali objek demo', async () => {
    for (const l of dunia.laporanData) {
      const [b] = await uji.sqlMigrasi`select desa_id, dusun_id, dibuat_pada, pelapor_penduduk_id, pelapor_nama, status, ditangani_oleh_id, ditangani_oleh_nama,
        ditangani_pada, ditangani_alasan, lampiran_berkas, lampiran_ukuran_kb, isi from laporan_data where id = ${l.id}`
      expect(b, l.id).toBeDefined()
      expect({ desaId: b.desa_id, dusunId: b.dusun_id, pada: (b.dibuat_pada as Date).getTime(), pelapor: { pendudukId: b.pelapor_penduduk_id, nama: b.pelapor_nama }, status: b.status, isi: b.isi }, l.id).toEqual({
        desaId: l.desaId, dusunId: l.dusunId, pada: new Date(l.dibuatPada).getTime(), pelapor: l.pelapor, status: l.status, isi: l.isi,
      })
      expect(b.ditangani_oleh_id).toBe(l.ditangani?.oleh.id ?? null)
      expect(b.lampiran_berkas).toBe(l.lampiran?.berkas ?? null)
    }
  })

  it('laporan perbaikan telepon disemai tersandi dan terbuka kembali; semai kedua tidak menggandakan', async () => {
    const dasar = dunia.laporanData[0]
    const telepon = { ...dasar, id: 'lap_uji_telepon', isi: { jenis: 'perbaikan' as const, pendudukId: 'pdk_siti_rahmah', field: 'telepon' as const, nilaiBaru: '081377712345', catatan: null } }
    const duniaTelepon = { ...dunia, laporanData: [...dunia.laporanData, telepon] }
    await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, { lingkungan: 'uji', dunia: duniaTelepon })
    await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, { lingkungan: 'uji', dunia: duniaTelepon })
    expect(await hitung('laporan_data')).toBe(dunia.laporanData.length + 1)
    const [b] = await uji.sqlMigrasi`select isi, isi::text as teks from laporan_data where id = 'lap_uji_telepon'`
    expect(b.teks.includes('081377712345')).toBe(false)
    expect(penyandi.bukaSandi(b.isi.nilaiBaru, `laporan_data.isi:${dasar.desaId}`)).toBe('081377712345')
    await uji.sqlMigrasi`delete from laporan_data where id = 'lap_uji_telepon'`
  })
})

describe('semai jenis surat dan pengaturan surat (rencana 8F1 Tugas 3)', () => {
  it('jumlah baris jenis_surat dan urutan kode per desa sama dengan dunia demo; ringkasan memuatnya', async () => {
    expect(dunia.jenisSurat.length).toBeGreaterThan(0)
    expect(await hitung('jenis_surat')).toBe(dunia.jenisSurat.length)
    for (const desa of dunia.desa) {
      const baris = await uji.sqlMigrasi`select kode from jenis_surat where desa_id = ${desa.id} order by urutan`
      expect(baris.map((b) => b.kode), desa.id).toEqual(dunia.jenisSurat.filter((j) => j.desaId === desa.id).map((j) => j.kode))
    }
    const ringkasan = await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(ringkasan).toMatchObject({ jenisSurat: dunia.jenisSurat.length, pengaturanSurat: dunia.desa.length })
  })

  it('setiap baris, dibentuk ulang, lolos jenisSuratSchema dan sama dengan jenis dunia demo; jenis bawaan tidak diarsipkan', async () => {
    const baris = await uji.sqlMigrasi`select * from jenis_surat order by urutan`
    expect(baris.length).toBe(dunia.jenisSurat.length)
    for (const [i, b] of baris.entries()) {
      const jenis = jenisSuratSchema.parse({
        id: b.id, desaId: b.desa_id, kode: b.kode, nama: b.nama, klasifikasi: b.klasifikasi, subjek: b.subjek, isian: b.isian,
        bolehAtasNama: b.boleh_atas_nama, wajibParaf: b.wajib_paraf, masaBerlakuBulan: b.masa_berlaku_bulan, online: b.online, syarat: b.syarat,
        teks: b.teks, aktif: b.aktif, asal: b.asal, diarsipkan: b.diarsipkan ? (b.diarsipkan as Date).toISOString() : null, tataLetak: b.tata_letak,
      })
      expect(jenis.id, `urutan ${i}`).toBe(dunia.jenisSurat[i].id)
      expect({ ...jenis, diarsipkan: null }, jenis.id).toEqual({ ...dunia.jenisSurat[i], diarsipkan: null })
      if (jenis.asal === 'bawaan') expect(b.diarsipkan, jenis.id).toBeNull()
    }
  })

  it('pengaturan_surat: satu baris per desa, tata letak lolos tataLetakSuratSchema, mode tanda tangan tte', async () => {
    expect(await hitung('pengaturan_surat')).toBe(dunia.desa.length)
    const baris = await uji.sqlMigrasi`select desa_id, tata_letak, mode_tanda_tangan, format_nomor, urutan from pengaturan_surat order by desa_id`
    expect(baris.map((b) => b.desa_id)).toEqual(dunia.desa.map((d) => d.id).sort())
    for (const b of baris) {
      expect(() => tataLetakSuratSchema.parse(b.tata_letak), b.desa_id).not.toThrow()
      expect(b.mode_tanda_tangan).toBe('tte')
      const dari = dunia.pengaturanSurat.find((p) => p.desaId === b.desa_id)
      if (dari) expect({ formatNomor: b.format_nomor, urutan: b.urutan }, b.desa_id).toEqual({ formatNomor: dari.formatNomor, urutan: dari.urutan })
    }
  })

  it('semai kedua kali dengan acuan yang sama tidak mengubah apa pun, dan tidak menimpa pengaturan yang sudah diubah desa', async () => {
    const sebelum = await uji.sqlMigrasi`select id, kode, urutan from jenis_surat order by urutan`
    await uji.sqlMigrasi`update pengaturan_surat set format_nomor = '{urut}/{tahun}' where desa_id = ${ID_SUNGAI_SIALANG}`
    await semaiDunia(uji.sqlMigrasi, penyandi, SEKARANG_UJI, opsiUji())
    expect(await uji.sqlMigrasi`select id, kode, urutan from jenis_surat order by urutan`).toEqual(sebelum)
    expect(await hitung('pengaturan_surat')).toBe(dunia.desa.length)
    const [b] = await uji.sqlMigrasi`select format_nomor from pengaturan_surat where desa_id = ${ID_SUNGAI_SIALANG}`
    expect(b.format_nomor).toBe('{urut}/{tahun}')
  })
})
