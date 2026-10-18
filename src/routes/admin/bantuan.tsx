import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { HalamanMasukBantuanRute } from '@/features/admin/HalamanMasukBantuan'

export const Route = createFileRoute('/admin/bantuan')({
  validateSearch: z.object({ tiket: z.string().optional().catch(undefined) }),
  component: HalamanMasukBantuanRute,
})
