import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/_panel/kependudukan/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/kependudukan/penduduk' })
  },
})
