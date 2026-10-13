import { createFileRoute } from '@tanstack/react-router'
import { StatistikPublik } from '@/features/publik/statistik/StatistikPublik'

export const Route = createFileRoute('/desa/$slug/statistik')({ component: StatistikPublik })
