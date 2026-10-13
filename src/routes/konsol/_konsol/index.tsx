import { createFileRoute } from '@tanstack/react-router'
import { RingkasanKonsol } from '@/features/konsol/ringkasan/RingkasanKonsol'

export const Route = createFileRoute('/konsol/_konsol/')({ component: RingkasanKonsol })
