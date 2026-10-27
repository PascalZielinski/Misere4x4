import { useCallback, useEffect, useRef, useState } from 'react'

export type Side = 'A' | 'B'

const TOTAL_MS = 4000
const START_DELAY = 50
const GROWTH = 1.12
const HOLD_MS = 1500

export function pickFirstPlayer(): Side {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % 2 === 0 ? 'A' : 'B'
}

export function buildSpinPlan(winner: Side) {
  const times: number[] = [0]
  let delay = START_DELAY
  let t = 0
  while (t + delay <= TOTAL_MS) {
    t += delay
    times.push(t)
    delay *= GROWTH
  }

  const other: Side = winner === 'A' ? 'B' : 'A'
  const last = times.length - 1
  const sides = times.map((_, i) => ((last - i) % 2 === 0 ? winner : other))

  return { times, sides }
}

export function useFirstTurnSpin() {
  const [shown, setShown] = useState<Side | null>(null)
  const [finished, setFinished] = useState(false)
  const timers = useRef<number[]>([])

  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const spin = useCallback(
    (winner: Side, onDone: () => void) => {
      cancel()
      setFinished(false)

      const { times, sides } = buildSpinPlan(winner)
      times.forEach((time, i) => {
        timers.current.push(window.setTimeout(() => setShown(sides[i]), time))
      })

      const end = times[times.length - 1]
      timers.current.push(window.setTimeout(() => setFinished(true), end))
      timers.current.push(window.setTimeout(onDone, end + HOLD_MS))
    },
    [cancel],
  )

  useEffect(() => cancel, [cancel])

  return { shown, finished, spin, cancel }
}