import { createContext, useContext } from 'react'
import type { IdFoto } from '@/domain/website/tema'

/** Perlakuan foto tema desa (`bingkai` atau `penuh`). Diisi kerangka website dan pratinjau Tampilan; bawaannya `bingkai`. */
export const FotoKonteks = createContext<IdFoto>('bingkai')

export const useBentukFoto = (): IdFoto => useContext(FotoKonteks)
