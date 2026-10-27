import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { ambilTokenSesi } from '@/api/client'
import { HalamanMasukAdmin } from '@/features/admin/HalamanMasukAdmin'

export const Route = createFileRoute('/admin/masuk')({
  validateSearch: z.object({ ke: z.string().startsWith('/admin').optional().catch(undefined) }),
  beforeLoad: () => {
    if (ambilTokenSesi()) throw redirect({ to: '/admin' })
  },
  component: HalamanMasukAdmin,
})
