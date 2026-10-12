import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { ambilTokenSesi } from '@/api/client'
import { HalamanMasukWarga } from '@/features/warga/HalamanMasukWarga'

export const Route = createFileRoute('/warga/masuk')({
  validateSearch: z.object({ ke: z.string().startsWith('/warga').optional().catch(undefined) }),
  beforeLoad: () => {
    if (ambilTokenSesi('warga')) throw redirect({ to: '/warga' })
  },
  component: HalamanMasukWarga,
})
