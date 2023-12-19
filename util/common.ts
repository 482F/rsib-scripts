/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { delay } from 'https://deno.land/std@0.207.0/async/delay.ts'
import { RsibApi } from 'rsib-type'

type Loader = RsibApi['load']

const loadedMap: Record<string, any> = {}

export const load = (() => {
  let loaderResolve: (loader: Loader) => void
  const loaderPromise = new Promise<Loader>((resolve) =>
    loaderResolve = resolve
  )

  async function _load<T>(
    name: string,
  ): Promise<T> {
    const loader = await loaderPromise
    const loaded = loadedMap[name] ??= loader<T>(name)

    return await loaded
  }

  return {
    setLoader(loader: Loader) {
      loaderResolve(loader)
    },
    preact: async () => {
      const React = await _load<typeof import('https://esm.sh/preact')>(
        'preact',
      )

      const hooks = await _load<typeof import('https://esm.sh/preact/hooks')>(
        'preact-hooks',
      )

      return {
        React,
        ...hooks,
      }
    },
  }
})()
