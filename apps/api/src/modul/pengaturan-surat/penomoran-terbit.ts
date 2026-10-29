import type { NomorTerbit } from '@sinfodes/kontrak/surat/penomoran'
import type { Db } from '../../basisdata/klien'
import { bacaNomorTerbit } from '../permohonan/repositori'

/**
 * Nomor surat yang sudah terbit (rencana 8F1 Ruling 10, diisi 8F2a), bahan contoh pada halaman Penomoran. Diambil dari kolom
 * `terbit_*` permohonan; surat yang dibatalkan tetap menggeser urut karena nomornya tidak dipakai ulang (SPEC §7.1).
 */
export const nomorTerbit = (db: Db, desaId: string): Promise<readonly NomorTerbit[]> => bacaNomorTerbit(db, desaId)
