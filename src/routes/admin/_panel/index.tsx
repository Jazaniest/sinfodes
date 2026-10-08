import { createFileRoute } from '@tanstack/react-router'
import { Beranda } from '@/features/beranda/Beranda'

export const Route = createFileRoute('/admin/_panel/')({ component: Beranda })
