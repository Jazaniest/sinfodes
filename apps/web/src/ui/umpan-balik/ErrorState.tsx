import { Tombol } from '../tombol/Tombol'

/** Keadaan galat: apa yang terjadi + Coba lagi (SPEC §4.4). `pesan` dari `pesanGalat()`. */
export function ErrorState({
  pesan,
  judul = 'Data tidak dapat dimuat',
  onCobaLagi,
}: {
  pesan: string
  judul?: string
  onCobaLagi?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-1 border-l-4 border-merah bg-merah-muda px-5 py-4">
      <p className="font-medium text-merah">{judul}</p>
      <p>{pesan}</p>
      {onCobaLagi && (
        <Tombol ukuran="kecil" onPress={onCobaLagi}>
          Coba lagi
        </Tombol>
      )}
    </div>
  )
}
