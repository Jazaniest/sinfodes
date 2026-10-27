import type postgres from 'postgres'

/**
 * Menyisipkan satu desa contoh lengkap (desa, dusun, satu keluarga, `jumlah` penduduk) lewat peran migrasi. Dipakai uji meta
 * RLS; nama dan ID sengaja tidak bertabrakan dengan data semai.
 */
export async function sisipkanDesaContoh(sql: postgres.Sql, desaId: string, jumlah = 2): Promise<{ pendudukIds: string[] }> {
  const slug = desaId.replaceAll('_', '-')
  const dusunId = `dsn_${desaId}`
  const keluargaId = `kk_${desaId}`
  const pendudukIds = Array.from({ length: jumlah }, (_, i) => `pdk_${desaId}_${i + 1}`)
  await sql.begin(async (tx) => {
    await tx`insert into desa (id, slug, nama, kode_desa, kecamatan_kode, kecamatan_nama, kabupaten_kode, kabupaten_nama,
        provinsi_kode, provinsi_nama, kode_pos, alamat_kantor, surel, telepon, jam_layanan, istilah_wilayah, kode_surat, status, warna_aksen)
      values (${desaId}, ${slug}, ${`Desa ${slug}`}, '14.05.09.2001', '14.05.09', 'Kecamatan Uji', '14.05', 'Kabupaten Uji', '14', 'Riau',
        '28000', 'Jl. Uji No. 1', 'desa@uji.example', '0761000000', ${tx.json([])}, ${tx.json({ dusun: 'Dusun', rw: 'RW', rt: 'RT' })}, '470', 'Aktif', '#1f5f4a')`
    await tx`insert into dusun (id, desa_id, nomor, nama, kepala_dusun, posyandu, rw)
      values (${dusunId}, ${desaId}, 1, 'Dusun I', 'Bapak Uji', 'Posyandu Uji', ${tx.json([])})`
    await tx`insert into keluarga (id, desa_id, nomor_kk_sandi, nomor_kk_indeks, kepala_keluarga_id, dusun_id, rw, rt, tanggal_terbit)
      values (${keluargaId}, ${desaId}, 'sandi', ${`indeks-${desaId}`}, ${pendudukIds[0]}, ${dusunId}, '001', '001', '2020-01-01')`
    for (const [i, id] of pendudukIds.entries()) {
      await tx`insert into penduduk (id, desa_id, nik_sandi, nik_indeks, nama, jenis_kelamin, golongan_darah, agama, kewarganegaraan,
          tempat_lahir, tanggal_lahir, keluarga_id, hubungan_keluarga, nama_ayah, nama_ibu, dusun_id, rw, rt, status_dasar, status_penduduk,
          ktp_el, dibuat_pada, diubah_pada)
        values (${id}, ${desaId}, 'sandi', ${`nik-${desaId}-${i}`}, ${`Warga ${i + 1}`}, 'L', 'O', 'Islam', 'WNI', 'Uji', '1990-01-01',
          ${keluargaId}, 'Kepala Keluarga', 'Ayah', 'Ibu', ${dusunId}, '001', '001', 'Hidup', 'Tetap', 'Sudah rekam', now(), now())`
    }
  })
  return { pendudukIds }
}
