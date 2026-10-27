import { createFileRoute } from '@tanstack/react-router'
import { BerandaPublik } from '@/features/publik/beranda/BerandaPublik'

export const Route = createFileRoute('/desa/$slug/')({ component: BerandaPublik })
