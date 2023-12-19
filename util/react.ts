/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { useState } from 'preact/hooks'
// const { useState } = await import('./common.ts')
//   .then(({ load }) => load.preact())

export function useStates<S extends Record<string, unknown>>(initialState: S) {
  const [states, setStates] = useState(initialState)
  return [states, (partialUpdater: (prevStates: S) => Partial<S>) => {
    setStates((prevStates) => {
      const partStates = partialUpdater(prevStates)
      return {
        ...prevStates,
        ...partStates,
      }
    })
  }] as const
}
