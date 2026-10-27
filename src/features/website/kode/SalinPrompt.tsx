import { useState } from 'react'
import { BAGIAN_KONTRAK, VARIABEL_KONTRAK, VERSI_KONTRAK_TEMA } from '@/domain/website/kontrak-tema'
import { susunPromptAi } from '@/domain/website/prompt-ai'
import { TextArea } from '@/ui/isian/TextArea'
import { Tombol } from '@/ui/tombol/Tombol'
import { tampilkanToast } from '@/ui/toast/antrean'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { useDrafSitus } from '../tampilan/useDrafSitus'

const TOAST_SALIN_PROMPT = 'Prompt disalin. Tempel ke AI pilihan Anda, lalu tempel jawabannya di sini.'

type Props = { jenis: 'css' | 'html' }

/** Salin prompt AI untuk CSS kustom atau Blok HTML (keputusan 10). Sinfodes tidak memanggil AI apa pun. */
export function SalinPrompt({ jenis }: Props) {
  const { isi } = useDrafSitus()
  const { desa } = useSesiAdmin()
  const [permintaan, setPermintaan] = useState('')
  if (!isi) return null

  const salin = () => {
    const teks = susunPromptAi({
      jenis,
      namaDesa: desa.nama,
      tema: isi.tema,
      kontrak: { versi: VERSI_KONTRAK_TEMA, variabel: VARIABEL_KONTRAK, bagian: BAGIAN_KONTRAK },
      permintaan: permintaan.trim(),
    })
    void navigator.clipboard
      .writeText(teks)
      .then(() => tampilkanToast({ pesan: TOAST_SALIN_PROMPT, nada: 'berhasil' }))
      .catch(() => tampilkanToast({ pesan: 'Prompt tidak bisa disalin otomatis.', nada: 'galat' }))
  }

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        label="Apa yang ingin diubah?"
        baris={3}
        value={permintaan}
        onChange={setPermintaan}
        maxLength={500}
      />
      <Tombol ukuran="kecil" onPress={salin} isDisabled={permintaan.trim() === ''}>
        Salin prompt
      </Tombol>
    </div>
  )
}
