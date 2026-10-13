import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { ambilTokenSesi } from '@/api/client'
import { HalamanMasukKonsol } from '@/features/konsol/HalamanMasukKonsol'

export const Route = createFileRoute('/konsol/masuk')({
  validateSearch: z.object({ ke: z.string().startsWith('/konsol').optional().catch(undefined) }),
  beforeLoad: () => {
    if (ambilTokenSesi('konsol')) throw redirect({ to: '/konsol' })
  },
  component: HalamanMasukKonsol,
})
