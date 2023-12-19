// ==UserScript==
// @name         vimium-like
// @match        http*://*/*
// @require      preact https://esm.sh/preact@10.17.1
// @require      preact-hooks https://esm.sh/preact@10.17.1/hooks
// ==/UserScript==

/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { RsibApi } from 'rsib-type'
import { insertStyle } from '482f-utils/browser/element.ts'
import * as util from '../util/common.ts'
import * as React from 'preact'
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks'

insertStyle(
  {
    '#vimium-like > div': {
      position: 'absolute',
      left: 0,
      top: 0,
      height: 0,
      width: 0,
      zIndex: 10000,
      pointerEvents: 'none',
    },
  },
)
const eventNames = ['keydown', 'keyup'] as const

export type Mode = 'normal' | 'easy-click'
export type KeyDef =
  & ({
    shiftKey: readonly boolean[]
    ctrlKey: readonly boolean[]
    altKey: readonly boolean[]
    key: readonly string[]
    eventName: readonly (typeof eventNames[number])[]
  } | {
    keys: readonly string[]
  })
  & {
    mode: readonly Mode[]
    exec: (
      payload: {
        shiftKey: boolean
        ctrlKey: boolean
        altKey: boolean
        mode: Mode
        key?: string
        keys?: string
        eventName: typeof eventNames[number]
      },
    ) => (void | {
      newMode: Mode
    }) extends infer R ? (R | Promise<R>) : never
  }

export type SetKeyDefs = (keyDefs: readonly KeyDef[]) => () => void

export default async function main({ load }: RsibApi) {
  // util.load.setLoader(load)
  // const { React, useRef, useCallback, useMemo, useEffect } = await util.load
  //   .preact()

  const rawChildren = await Promise.all([
    import('./easy-click.tsx').then((m) => m.EasyClick),
  ])

  function Vimium() {
    const keyDefs = useRef(new Set<KeyDef>())
    const setKeyDefs = useCallback<SetKeyDefs>((addends) => {
      addends.forEach((keyDef) => keyDefs.current.add(keyDef))
      return () => addends.forEach((keyDef) => keyDefs.current.delete(keyDef))
    }, [])

    const states = useRef({
      mode: 'normal' satisfies Mode as Mode,
      presseds: '',
    })
    const listener = useCallback(
      (eventName: typeof eventNames[number], e: KeyboardEvent) => {
        if (e.key.length !== 1 || e.srcElement instanceof HTMLInputElement) {
          return
        }

        const { mode, presseds } = states.current
        const partPayload = {
          key: e.key.toLowerCase(),
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          eventName: eventName,
          mode,
          keys: presseds,
        }
        keyDefs.current.forEach(async (def) => {
          const isMatched = Object.entries(def)
            .every(([key, expecteds]) =>
              // expecteds が配列でない === 判定対象ではない
              !('includes' in expecteds) ||
              expecteds.includes(
                partPayload[key as keyof typeof partPayload] as never,
              )
            )

          if (!isMatched) {
            return
          }
          e.preventDefault()

          const { newMode } = (await def.exec(partPayload)) ?? {}
          if (newMode) {
            states.current.mode = newMode
          }
        })
      },
      [],
    )

    useEffect(() => {
      const destructors = eventNames.map((eventName) => {
        const l = (e: KeyboardEvent) => listener(eventName, e)
        globalThis.addEventListener(eventName, l, true)
        return () => globalThis.removeEventListener(eventName, l, true)
      })
      return () => destructors.forEach((destructor) => destructor())
    }, [])

    const children = useMemo(
      () => rawChildren.map((Child) => <Child setKeyDefs={setKeyDefs} />),
      [...rawChildren, setKeyDefs],
    )

    return (
      <div>
        {children}
      </div>
    )
  }

  const div = document.createElement('div')
  div.id = 'vimium-like'
  document.body.appendChild(div)

  React.render(<Vimium />, div)
}
