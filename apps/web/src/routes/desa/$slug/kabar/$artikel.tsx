import { createFileRoute } from '@tanstack/react-router'
import { HalamanArtikel } from '@/features/publik/kabar/HalamanArtikel'

export const Route = createFileRoute('/desa/$slug/kabar/$artikel')({ component: HalamanArtikel })
