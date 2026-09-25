import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <main>
      <h1>Sinfodes</h1>
      <p>Fondasi sedang disiapkan.</p>
    </main>
  ),
})
