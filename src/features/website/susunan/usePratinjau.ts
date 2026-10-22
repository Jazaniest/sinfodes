import { useQuery } from '@tanstack/react-query'
import { pratinjauSitus } from '@/api/website'
import { useTunda } from '@/ui/hooks/useTunda'
import type { IsiDraf } from '../tampilan/useDrafSitus'

/**
 * Pratinjau halaman yang sedang disunting (7F-2): `POST pratinjau` ditunda 400 ms setelah perubahan. Hasilnya juga
 * menjadi sumber tanda blok kosong di daftar blok.
 */
export function usePratinjau(isi: IsiDraf | null, halaman: string) {
  const tertunda = useTunda(isi, 400)
  return useQuery({
    queryKey: ['website', 'pratinjau', halaman, tertunda],
    queryFn: () => {
      if (!tertunda) throw new Error('Isi pratinjau belum ada.')
      return pratinjauSitus(tertunda, halaman)
    },
    enabled: tertunda !== null,
  })
}
