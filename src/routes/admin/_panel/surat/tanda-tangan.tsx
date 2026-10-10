import { createFileRoute } from '@tanstack/react-router'
import { HalamanTandaTangan } from '@/features/surat/HalamanTandaTangan'

export const Route = createFileRoute('/admin/_panel/surat/tanda-tangan')({ component: HalamanTandaTangan })
