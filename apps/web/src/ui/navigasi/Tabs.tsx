import type { ReactNode } from 'react'
import { Tab, TabList, TabPanel, Tabs as RacTabs } from 'react-aria-components'

export type ItemTabPanel = { id: string; label: string; isi: ReactNode }

/** Tab di dalam satu halaman, mis. kolom samping profil (SPEC §6.3). */
export function Tabs({ label, items, bawaan }: { label: string; items: readonly ItemTabPanel[]; bawaan?: string }) {
  return (
    <RacTabs defaultSelectedKey={bawaan ?? items[0]?.id}>
      {/* Garis bawah dari bayangan dalam, bukan border + margin negatif: wadah yang bisa digeser tidak boleh meluber tegak. */}
      <TabList aria-label={label} className="flex gap-5 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-garis)]">
        {items.map((t) => (
          <Tab
            key={t.id}
            id={t.id}
            className="shrink-0 cursor-default border-b-2 whitespace-nowrap border-transparent py-2 text-teks font-medium text-tinta-2 outline-none data-[hovered]:text-tinta data-[selected]:border-biru data-[selected]:text-tinta data-[focus-visible]:outline-2 data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru"
          >
            {t.label}
          </Tab>
        ))}
      </TabList>
      {items.map((t) => (
        <TabPanel key={t.id} id={t.id} className="pt-4 outline-none">
          {t.isi}
        </TabPanel>
      ))}
    </RacTabs>
  )
}
