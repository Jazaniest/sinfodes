import { bisaBukaBerkas, urlBerkasScan } from '@/api/berkas'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal, formatWaktuLog } from '@/domain/format/tanggal'
import type { SuratMasuk } from '@/domain/surat/arsip'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Drawer } from '@/ui/lapisan/Drawer'
import { Tautan } from '@/ui/navigasi/Tautan'

/** Rincian satu surat masuk: register lengkap dan disposisinya. */
export function LaciSuratMasuk({ surat, onTutup }: { surat: SuratMasuk | null; onTutup: () => void }) {
  return (
    <Drawer
      isOpen={surat !== null}
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={surat ? `Surat masuk No. ${String(surat.noAgenda).padStart(3, '0')}` : 'Surat masuk'}
    >
      {surat && (
        <DescriptionList
          items={[
            { label: 'Diterima', nilai: formatTanggal(surat.diterima, 'hari') },
            { label: 'Nomor surat', nilai: <span className="font-mono">{surat.nomor}</span> },
            { label: 'Tanggal surat', nilai: formatTanggal(surat.tanggalSurat) },
            { label: 'Pengirim', nilai: surat.pengirim },
            { label: 'Perihal', nilai: surat.perihal },
            {
              label: 'Disposisi',
              nilai: surat.disposisi ? (
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{surat.disposisi.kepada}</span>
                  {surat.disposisi.instruksi && <span>{surat.disposisi.instruksi}</span>}
                </span>
              ) : (
                'Tanpa disposisi'
              ),
            },
            {
              label: 'Scan',
              nilai: surat.scan ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{`${surat.scan.berkas} · ${formatAngka(surat.scan.ukuranKb)} KB`}</span>
                  {bisaBukaBerkas() && (
                    <Tautan href={urlBerkasScan(surat.id)} target="_blank" rel="noopener noreferrer" aria-label="Buka pindaian">
                      Buka
                    </Tautan>
                  )}
                </span>
              ) : (
                'Tidak ada scan'
              ),
            },
            { label: 'Dicatat', nilai: `${surat.dicatat.oleh.nama} · ${formatWaktuLog(surat.dicatat.pada)}` },
          ]}
        />
      )}
    </Drawer>
  )
}
