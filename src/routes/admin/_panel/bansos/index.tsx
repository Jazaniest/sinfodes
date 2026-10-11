import { createFileRoute } from '@tanstack/react-router'
import { HalamanDaftarProgram } from '@/features/bansos/HalamanDaftarProgram'

export const Route = createFileRoute('/admin/_panel/bansos/')({ component: HalamanDaftarProgram })
