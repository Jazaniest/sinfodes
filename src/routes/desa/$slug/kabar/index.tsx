import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { KATEGORI_ARTIKEL } from '@/domain/website/schema'
import { HalamanKabar } from '@/features/publik/kabar/HalamanKabar'

export const Route = createFileRoute('/desa/$slug/kabar/')({
  validateSearch: z.object({ kategori: z.enum(KATEGORI_ARTIKEL).optional().catch(undefined) }),
  component: HalamanKabar,
})
