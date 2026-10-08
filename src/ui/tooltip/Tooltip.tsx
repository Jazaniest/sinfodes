import type { ReactElement, ReactNode } from 'react'
import { Tooltip as RacTooltip, TooltipTrigger } from 'react-aria-components'

/** `children` harus bisa difokus (mis. `Button` React Aria) agar tooltip juga muncul lewat keyboard. */
export function Tooltip({ isi, children, delay = 400 }: { isi: ReactNode; children: ReactElement; delay?: number }) {
  return (
    <TooltipTrigger delay={delay}>
      {children}
      <RacTooltip offset={6} className="max-w-xs rounded-1 bg-tinta px-2 py-1 text-teks-kecil text-kapur shadow-melayang">
        {isi}
      </RacTooltip>
    </TooltipTrigger>
  )
}
