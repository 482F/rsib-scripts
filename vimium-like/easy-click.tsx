import { KeyDef, Mode, SetKeyDefs } from './main.tsx'
import { useStates } from '../util/react.ts'
import { insertStyle } from '482f-utils/browser/element.ts'

import * as React from 'preact'
import { useCallback, useEffect, useMemo } from 'preact/hooks'

// const { React, useState, useEffect, useMemo, useCallback, useRef } =
//   await import(
//     '../util/common.ts'
//   )
//     .then(({ load }) => load.preact())

const clickers = (() => {
  const f = <
    E extends typeof Element,
    C extends (el: E['prototype'], newTab: boolean) => unknown,
  >(e: E, c: C) => [e, c] as const
  return [
    f(HTMLButtonElement, (el, _newTab) => el.click()),
    f(HTMLAnchorElement, (el, newTab) => {
      if (newTab) {
        window.open(el.href)
      } else {
        el.click()
      }
    }),
  ] as const
})()

const clickEl = (el: Element, newTab: boolean) => {
  const [, clicker] = clickers
    .find(([elClass]) => el instanceof elClass) ?? []
  clicker?.(el as any, newTab)
}

const labelChars = 'qwertasdgzxvb'.split('')

insertStyle(
  {
    '#vimium-like .easy-click .tooltip-outer': {
      '--presseds-length': 0,

      '.tooltip': {
        position: 'absolute',
        left: 'var(--left)',
        top: 'var(--top)',

        backgroundColor: 'hsl(60 18% 88%)',
        fontFamily: 'Cica',
        fontSize: '16px',
        padding: '0 4px',
        borderRadius: '8px',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'lightgray',
        whiteSpace: 'nowrap',

        // --presseds-length の数だけ文字を白くする
        '> span': {
          '--multiplier': 'max(var(--presseds-length) - var(--me), 0)',
          color:
            'hsl(60 18% calc(78% * (var(--multiplier) / var(--multiplier))))',
        },
        ...(Object.fromEntries(
          new Array(
            Math.ceil(Math.log(10000) / Math.log(labelChars.length)),
          )
            .fill(0)
            .map((_, i) => [`> span:nth-child(${i + 1})`, {
              '--me': i,
            }]),
        )),
      },
    },
  },
)
function Tooltip(
  { label, left, top }: {
    label: string
    left: number
    top: number
  },
) {
  return (
    <div
      className='tooltip'
      style={{
        '--left': `${left}px`,
        '--top': `${top}px`,
      }}
    >
      {label.toUpperCase().split('').map((char) => <span>{char}</span>)}
    </div>
  )
}

function useTooltips({ active = true }: { active?: boolean } = {}) {
  const allData = useMemo(
    () => {
      if (!active) {
        return []
      }
      const clickables = [...document.querySelectorAll('a,button')].map(
        (clickable) => {
          const { top, bottom, left, right } = clickable.getBoundingClientRect()

          const pageHeight = Math.max(
            window.innerHeight,
            document.documentElement.clientHeight,
          )
          const pageWidth = Math.max(
            window.innerWidth,
            document.documentElement.clientWidth,
          )

          if (
            bottom < 1 || pageHeight - 1 < top ||
            left < 1 || pageWidth - 1 < right
          ) {
            return
          }
          return {
            clickable,
            top: top + document.documentElement.scrollTop,
            left: left + document.documentElement.scrollLeft,
          }
        },
      )
        .filter(<T,>(d: T): d is NonNullable<T> => Boolean(d))

      if (clickables.length <= 0) {
        return []
      }

      const labelLength = Math.ceil(
        Math.log(clickables.length) / Math.log(labelChars.length),
      )
      const indice = new Array(labelLength).fill(0)
      return clickables.map((clickable) => {
        indice[0]++
        for (let i = 0; i < indice.length; i++) {
          if (indice[i] < labelChars.length) {
            continue
          }
          indice[i] = 0
          indice[i + 1]++
        }

        const label = indice.map((i) => labelChars[i]).toReversed().join('')
        return {
          ...clickable,
          label,
          el: (
            <Tooltip
              label={label}
              left={clickable.left}
              top={clickable.top}
            />
          ),
        }
      })
    },
    [active],
  )

  const [{ presseds, filtereds }, setStates] = useStates({
    presseds: '',
    filtereds: allData,
  })
  if (allData.length <= 0) {
    setStates(() => ({ presseds: '' }))
  }

  const addPressed = useCallback(
    (pressed: string) =>
      new Promise<typeof filtereds>((resolve) =>
        setStates(({ presseds, filtereds }) => {
          const newPresseds = presseds + pressed
          const newFiltereds = filtereds
            .filter(({ label }) => label.startsWith(newPresseds))
          resolve(newFiltereds)
          return {
            presseds: newPresseds,
            filtereds: newFiltereds,
          }
        })
      ),
    [setStates],
  )

  return [
    <div
      className='tooltip-outer'
      style={{ '--presseds-length': presseds.length }}
    >
      {filtereds.map(({ el }) => el)}
    </div>,
    addPressed,
  ] as const
}

export function EasyClick(
  { setKeyDefs: _setKeyDefs }: { setKeyDefs: SetKeyDefs },
) {
  const [{ mode, startNewTab }, setStates] = useStates({
    mode: 'normal' satisfies Mode as Mode,
    startNewTab: false,
  })
  const active = useMemo(() => mode === 'easy-click', [mode])
  const setKeyDefs: SetKeyDefs = (keyDefs) => {
    return _setKeyDefs(keyDefs.map((def) => ({
      ...def,
      exec: async (...param) => {
        const result = await def.exec(...param)
        setStates((states) => ({
          mode: result?.newMode ?? states.mode,
        }))
        return result
      },
    })))
  }
  useEffect(() =>
    setKeyDefs([
      { // start
        ctrlKey: [false],
        shiftKey: [true, false],
        altKey: [true, false],
        eventName: ['keydown'],
        mode: ['normal'],
        key: ['f'],
        exec: ({ key, shiftKey }) => {
          console.log('to easy-click')
          setStates(() => ({ startNewTab: shiftKey }))
          return { newMode: 'easy-click' }
        },
      },
      { // stop
        ctrlKey: [true],
        shiftKey: [true, false],
        altKey: [true, false],
        eventName: ['keydown'],
        mode: ['easy-click'],
        key: ['c'],
        exec: ({ key }) => {
          console.log('to normal')
          return { newMode: 'normal' }
        },
      },
    ]), [setKeyDefs])

  const onConfirm = useCallback((clickable: Element, endNewTab: boolean) => {
    const newTab = (Number(startNewTab) + Number(endNewTab)) === 1
    clickEl(clickable, newTab)
  }, [startNewTab])

  return (
    <div className='easy-click'>
      {active
        ? <ActiveEasyClick setKeyDefs={setKeyDefs} onConfirm={onConfirm} />
        : null}
    </div>
  )
}

function ActiveEasyClick(
  { setKeyDefs, onConfirm }: {
    setKeyDefs: SetKeyDefs
    onConfirm: (clickable: Element, endNewTab: boolean) => void
  },
) {
  const [tooltipEls, addPressed] = useTooltips()
  useEffect(() =>
    setKeyDefs([
      { // label
        ctrlKey: [false],
        shiftKey: [true, false],
        altKey: [true, false],
        eventName: ['keydown'],
        mode: ['easy-click'],
        key: labelChars,
        exec: async ({ key, shiftKey }) => {
          const [confirmed, ...rest] = await addPressed(key ?? '')

          if (rest.length <= 0) {
            if (confirmed) {
              onConfirm(confirmed.clickable, shiftKey)
            }
            return { newMode: 'normal' }
          }
        },
      },
    ]), [setKeyDefs])

  return (
    <>
      {tooltipEls}
    </>
  )
}
