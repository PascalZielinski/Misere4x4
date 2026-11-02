//#region Imports
// MARK: - Imports
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Navigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import LocalizedLink from '../components/LocalizedLink'
import { pickFirstPlayer, type Side } from '../game/firstTurn'
import { cellLabel, newGameState, placeAt, SIZE } from '../game/placement'
import { getResult } from '../game/result'
import type { Mark, SavedGame } from '../utils/localGameStorage'
import './Adminpage.css'
//#endregion

//#region Desktop sky configuration
// MARK: - Desktop sky configuration
type RGB = [number, number, number]

function makeStars(count: number): { x: number; y: number; size: number; delay: number }[] {
  const stars: { x: number; y: number; size: number; delay: number }[] = []
  for (let i = 0; i < count; i++) {
    const r = Math.random()
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: r < 0.15 ? 3 : r < 0.45 ? 2 : 1,
      delay: Math.random() * 6,
    })
  }
  return stars
}

const STARS = makeStars(75)

const SKY_KEYS: { h: number; top: RGB; mid: RGB; bot: RGB }[] = [
  { h: 0,    top: [10, 18, 45],   mid: [20, 32, 72],   bot: [36, 52, 95]   },
  { h: 5,    top: [16, 26, 58],   mid: [40, 55, 100],  bot: [90, 100, 140] },
  { h: 6.5,  top: [92, 52, 82],   mid: [220, 120, 95], bot: [255, 196, 140] },
  { h: 8.5,  top: [40, 100, 170], mid: [90, 150, 210], bot: [180, 215, 240] },
  { h: 12,   top: [28, 95, 168],  mid: [61, 143, 212], bot: [142, 201, 239] },
  { h: 16.5, top: [40, 100, 170], mid: [90, 150, 210], bot: [180, 215, 240] },
  { h: 18.5, top: [86, 66, 110],  mid: [220, 120, 80], bot: [255, 168, 98]  },
  { h: 20.5, top: [25, 20, 55],   mid: [45, 30, 70],   bot: [80, 50, 92]   },
  { h: 24,   top: [10, 18, 45],   mid: [20, 32, 72],   bot: [36, 52, 95]   },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpColor(c1: RGB, c2: RGB, t: number) {
  return `rgb(${Math.round(lerp(c1[0], c2[0], t))}, ${Math.round(lerp(c1[1], c2[1], t))}, ${Math.round(
    lerp(c1[2], c2[2], t),
  )})`
}

function skyColors(h: number) {
  const hour = ((h % 24) + 24) % 24
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const a = SKY_KEYS[i]
    const b = SKY_KEYS[i + 1]
    if (hour >= a.h && hour <= b.h) {
      const t = (hour - a.h) / (b.h - a.h)
      return {
        top: lerpColor(a.top, b.top, t),
        mid: lerpColor(a.mid, b.mid, t),
        bot: lerpColor(a.bot, b.bot, t),
      }
    }
  }
  return { top: 'rgb(28, 95, 168)', mid: 'rgb(61, 143, 212)', bot: 'rgb(142, 201, 239)' }
}

function nightAmount(h: number): number {
  if (h >= 7 && h <= 18) return 0
  if (h >= 20 || h <= 5) return 1
  if (h > 18 && h < 20) return (h - 18) / 2
  return 1 - (h - 5) / 2
}
//#endregion

//#region Terminal game helpers
// MARK: - Terminal game helpers
const BOARD_LETTERS = ['a', 'b', 'c', 'd']

function formatBoard(board: (Mark | null)[]): string[] {
  const lines: string[] = ['  1 2 3 4']
  for (let r = 0; r < SIZE; r++) {
    const cells: string[] = []
    for (let c = 0; c < SIZE; c++) {
      cells.push(board[r * SIZE + c] ?? '.')
    }
    lines.push(`${BOARD_LETTERS[r]} ${cells.join(' ')}`)
  }
  return lines
}

function parseMove(raw: string): number | null {
  const s = raw
    .toLowerCase()
    .replace(/^set\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  const m = s.match(/^([a-d])\s*([1-4])$/)
  if (!m) return null
  const row = m[1].charCodeAt(0) - 97
  const col = parseInt(m[2], 10) - 1
  return row * SIZE + col
}

function createFreshGame(first: Side): SavedGame {
  const base = newGameState(first)
  return {
    board: base.board,
    turn: base.turn,
    moves: base.moves,
    markA: 'X',
    markB: 'O',
  } as SavedGame
}
//#endregion

//#region Terminal simulation helpers
// MARK: - Terminal simulation helpers
type Step = { line: string; wait: number; replace?: boolean }

const REPO = '3erReihe'
const INSTALL_KEY = 'projectInstalled'

const FAKE_PACKAGES = [
  'react', 'react-dom', 'react-router', 'react-i18next',
  'i18next', 'typescript', 'vite', '@vitejs/plugin-react',
]

function readInstalled(): boolean {
  try {
    return sessionStorage.getItem(INSTALL_KEY) === '1'
  } catch {
    return false
  }
}

function writeInstalled() {
  try {
    sessionStorage.setItem(INSTALL_KEY, '1')
  } catch {

  }
}

function bar(label: string, p: number): string {
  const n = 20
  const filled = Math.round(p * n)
  return `${label} [${'#'.repeat(filled)}${'.'.repeat(n - filled)}] ${Math.round(p * 100)}%`
}

function progress(label: string, steps = 10, wait = 110): Step[] {
  const out: Step[] = [{ line: bar(label, 0), wait: 150 }]
  for (let i = 1; i <= steps; i++) {
    out.push({ line: bar(label, i / steps), wait, replace: true })
  }
  return out
}

function installSteps(): Step[] {
  return [
    { line: 'Pakete werden aufgelöst...', wait: 400 },
    ...progress('Lade Pakete', 14, 140),
    ...FAKE_PACKAGES.map((p) => ({ line: `+ ${p}`, wait: 120 })),
    { line: '', wait: 200 },
    { line: 'added 214 packages, and audited 215 packages in 6s', wait: 400 },
    { line: 'found 0 vulnerabilities', wait: 100 },
  ]
}
//#endregion

//#region Draggable window
// MARK: - Draggable window
type WindowKind = 'default' | 'folder' | 'txt' | 'cmd'

function DraggableWindow({
  title,
  kind = 'default',
  onClose,
  children,
  initial,
  zIndex,
  onActivate,
}: {
  title: ReactNode
  kind?: WindowKind
  onClose: () => void
  children: ReactNode
  initial: { x: number; y: number }
  zIndex: number
  onActivate: () => void
}) {
  const { t } = useTranslation()
  const [offset, setOffset] = useState(initial)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  //#region Drag interactions
  // MARK: Drag interactions
  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    setDragging(true)
  }

  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    setOffset({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y })
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <section
      className={`desktop-window desktop-window--${kind}${dragging ? ' is-dragging' : ''}`}
      style={{
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        zIndex,
      }}
      onPointerDown={onActivate}
    >
      <header
        className="desktop-window-bar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="desktop-window-title">
          <span
            className={`desktop-window-icon desktop-window-icon--${kind}`}
            aria-hidden="true"
          />
          {title}
        </span>
        <div className="desktop-window-actions">
          <button
            type="button"
            className="desktop-window-btn desktop-window-btn--close"
            onClick={onClose}
            aria-label={t('admin.close')}
          >
            ✕
          </button>
        </div>
      </header>
      {children}
    </section>
  )
  //#endregion
}
//#endregion

//#region Analog clock
// MARK: - Analog clock
function AnalogClock({
  hour,
  minute,
  onChange,
}: {
  hour: number
  minute: number
  onChange: (h: number, m: number) => void
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [dragMode, setDragMode] = useState<null | 'hour' | 'minute'>(null)

  const hourAngle = (hour % 12) * 30 + minute * 0.5
  const minuteAngle = minute * 6

  //#region Clock interactions
  // MARK: Clock interactions
  const angleFromEvent = (e: ReactPointerEvent<SVGSVGElement>): number | null => {
    const svg = ref.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return ((Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI + 360) % 360
  }

  const applyHourAngle = (angle: number) => {
    const H = Math.floor(angle / 30) % 12
    let M = Math.round((angle - H * 30) * 2)
    let HH = H
    if (M >= 60) { M -= 60; HH = (HH + 1) % 12 }
    if (M < 0)  { M += 60; HH = (HH + 11) % 12 }
    const isPM = hour >= 12
    let newHour = HH
    if (isPM && newHour < 12) newHour += 12
    onChange(newHour, M)
  }

  const applyMinuteAngle = (angle: number) => {
    const m = Math.round(angle / 6) % 60
    onChange(hour, m)
  }

  const handleDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const angle = angleFromEvent(e)
    if (angle === null) return
    const diff = (a: number, b: number) => {
      const d = Math.abs(a - b) % 360
      return Math.min(d, 360 - d)
    }
    const mode: 'hour' | 'minute' =
      diff(angle, hourAngle) < diff(angle, minuteAngle) ? 'hour' : 'minute'
    setDragMode(mode)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (mode === 'hour') applyHourAngle(angle)
    else applyMinuteAngle(angle)
  }

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragMode) return
    const angle = angleFromEvent(e)
    if (angle === null) return
    if (dragMode === 'hour') applyHourAngle(angle)
    else applyMinuteAngle(angle)
  }

  const handleUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    setDragMode(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const point = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180
    return { x: 100 + Math.sin(rad) * r, y: 100 - Math.cos(rad) * r }
  }

  const hourTip = point(hourAngle, 46)
  const minuteTip = point(minuteAngle, 72)
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <svg
      ref={ref}
      className="analog-clock"
      viewBox="0 0 200 200"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <circle cx="100" cy="100" r="96" className="analog-clock-face" />
      <circle cx="100" cy="100" r="95" className="analog-clock-rim" />
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0
        const p1 = point(i * 6, major ? 82 : 88)
        const p2 = point(i * 6, 92)
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            className={
              major ? 'analog-clock-tick analog-clock-tick--major' : 'analog-clock-tick'
            }
          />
        )
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const p = point(i * 30, 70)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="analog-clock-num"
          >
            {i === 0 ? 12 : i}
          </text>
        )
      })}
      <line
        x1="100"
        y1="100"
        x2={hourTip.x}
        y2={hourTip.y}
        className="analog-clock-hand analog-clock-hand--hour"
      />
      <line
        x1="100"
        y1="100"
        x2={minuteTip.x}
        y2={minuteTip.y}
        className="analog-clock-hand analog-clock-hand--minute"
      />
      <circle cx="100" cy="100" r="5" className="analog-clock-center" />
    </svg>
  )
  //#endregion
}
//#endregion

//#region Admin dashboard access
// MARK: - Admin dashboard access
export default function AdminDashboard() {
  const { lang } = useParams()

  if (!sessionStorage.getItem('adminUser')) {
    return <Navigate to={`/${lang}/401`} replace />
  }

  return <AdminDesktop />
}
//#endregion

//#region Admin desktop
// MARK: - Admin desktop
function AdminDesktop() {
  //#region Desktop state
  // MARK: Desktop state
  const { t } = useTranslation()
  const readmeText = [
    t('admin.readme.heading'),
    '',
    t('admin.readme.openCmd'),
    t('admin.readme.clone'),
    t('admin.readme.changeDirectory'),
    t('admin.readme.start'),
  ].join('\n')
  const [name] = useState(
    () => sessionStorage.getItem('adminUser') || 'Administrator',
  )

  const [folderOpen, setFolderOpen] = useState(false)
  const [readmeOpen, setReadmeOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [timeOffsetSec, setTimeOffsetSec] = useState(0)
  const [clockOpen, setClockOpen] = useState(false)

  const [zTop, setZTop] = useState(5)
  const [windowZ, setWindowZ] = useState<Record<string, number>>({
    main: 1,
    folder: 2,
    readme: 3,
    cmd: 4,
  })
  const activate = (id: 'main' | 'folder' | 'readme' | 'cmd') => {
    setWindowZ((prev) => ({ ...prev, [id]: zTop }))
    setZTop((z) => z + 1)
  }

  const [cmdLines, setCmdLines] = useState<string[]>([
    'LouvreOS [Version 1.0.0]',
    t('admin.terminal.copyright'),
    '',
    t('admin.terminal.readmeHint'),
    t('admin.terminal.helpHint'),
    '',
  ])
  const [cmdInput, setCmdInput] = useState('')
  const [game, setGame] = useState<SavedGame | null>(null)
  const cmdOutputRef = useRef<HTMLDivElement>(null)

  const [cwd, setCwd] = useState('C:\\')
  const [installed, setInstalled] = useState(readInstalled)
  const [busy, setBusy] = useState(false)
  const cmdInputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  //#endregion

  //#region Desktop lifecycle
  // MARK: Desktop lifecycle
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach((id) => window.clearTimeout(id))
  }, [])

  useEffect(() => {
    if (!busy) cmdInputRef.current?.focus()
  }, [busy])

  useEffect(() => {
    if (!startOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStartOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [startOpen])

  useEffect(() => {
    if (cmdOutputRef.current) {
      cmdOutputRef.current.scrollTop = cmdOutputRef.current.scrollHeight
    }
  }, [cmdLines])
  //#endregion

  //#region Terminal actions
  // MARK: Terminal actions
  const play = (steps: Step[], onDone?: () => void) => {
    setBusy(true)
    let tt = 0
    for (const s of steps) {
      tt += s.wait
      timers.current.push(
        window.setTimeout(() => {
          setCmdLines((prev) =>
            s.replace ? [...prev.slice(0, -1), s.line] : [...prev, s.line],
          )
        }, tt),
      )
    }
    timers.current.push(
      window.setTimeout(() => {
        setCmdLines((prev) => [...prev, ''])
        onDone?.()
        setBusy(false)
      }, tt + 100),
    )
  }

  const markInstalled = () => {
    writeInstalled()
    setInstalled(true)
  }

  const fakeCommand = (lower: string): { steps: Step[]; done?: () => void } | null => {
    const inRepo = cwd !== 'C:\\'

    if (/^git clone\s+\S+/.test(lower)) {
      return {
        steps: [
          { line: `Cloning into '${REPO}'...`, wait: 300 },
          { line: 'remote: Enumerating objects: 412, done.', wait: 500 },
          { line: 'remote: Counting objects: 100% (412/412), done.', wait: 300 },
          ...progress('Receiving objects', 12, 130),
          ...progress('Resolving deltas ', 6, 100),
          { line: '', wait: 200 },
          ...installSteps(),
        ],
        done: markInstalled,
      }
    }

    if (/^cd\s+\.\.$/.test(lower)) {
      return { steps: [], done: () => setCwd('C:\\') }
    }

    if (/^cd\s+3erreihe$/.test(lower)) {
      if (!installed) {
        return {
          steps: [{ line: 'Der angegebene Pfad wurde nicht gefunden.', wait: 150 }],
        }
      }
      return { steps: [], done: () => setCwd(`C:\\${REPO}`) }
    }

    if (/^npm (install|i)$/.test(lower)) {
      if (!inRepo) {
        return {
          steps: [
            { line: 'npm error code ENOENT', wait: 300 },
            { line: 'npm error package.json wurde nicht gefunden.', wait: 100 },
          ],
        }
      }
      return { steps: installSteps(), done: markInstalled }
    }

    if (lower === 'npm run dev') {
      if (!inRepo) {
        return {
          steps: [{ line: 'npm error package.json wurde nicht gefunden.', wait: 200 }],
        }
      }
      return {
        steps: [
          { line: `> ${REPO.toLowerCase()}@0.0.0 dev`, wait: 300 },
          { line: '> vite', wait: 100 },
          { line: '', wait: 400 },
          { line: '  VITE ready in 412 ms', wait: 600 },
          { line: '', wait: 50 },
          { line: '  ➜  Local:   http://localhost:5173/', wait: 100 },
          { line: '  ➜  Tipp: "3erReihe -start" startet das Spiel.', wait: 100 },
        ],
      }
    }

    return null
  }

  const submitCmd = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const raw = cmdInput.trim()
    if (!raw) return
    const next = [...cmdLines, `${cwd}> ${raw}`]

    if (game) {
      const moveIndex = parseMove(raw)
      if (moveIndex !== null) {
        const after = placeAt(game, moveIndex)
        if (!after) {
          next.push(`Feld "${cellLabel(moveIndex)}" ist ungültig oder bereits belegt.`)
        } else {
          next.push('')
          next.push(...formatBoard(after.board))
          next.push('')

          const result = getResult(after)
          if (result.status === 'lost') {
            const winner: Side = result.loser === 'A' ? 'B' : 'A'
            next.push(
              `Spieler ${result.loser} hat drei in einer Reihe gelegt und verliert.`,
            )
            next.push(`Spieler ${winner} gewinnt!`)
            next.push('Tippe "3erReihe -start" für eine neue Runde.')
            setGame(null)
          } else if (result.status === 'draw') {
            next.push('Keine Züge mehr möglich — Unentschieden.')
            next.push('Tippe "3erReihe -start" für eine neue Runde.')
            setGame(null)
          } else {
            const mark = after.turn === 'A' ? after.markA : after.markB
            next.push(`Spieler ${after.turn} (${mark}) ist am Zug.`)
            setGame(after)
          }
        }
        next.push('')
        setCmdLines(next)
        setCmdInput('')
        return
      }
    }

    const lower = raw.toLowerCase()

    const fake = fakeCommand(lower)
    if (fake) {
      setCmdLines(next)
      setCmdInput('')
      play(fake.steps, fake.done)
      return
    }

    if (installed && /^3erreihe -start\b/.test(lower)) {
      let first: Side
      if (/\s-a\b/.test(lower)) first = 'A'
      else if (/\s-b\b/.test(lower)) first = 'B'
      else first = pickFirstPlayer()

      const fresh = createFreshGame(first)
      setGame(fresh)

      next.push('')
      next.push('Neues Spiel gestartet.')
      next.push(`Spieler ${first} (${first === 'A' ? fresh.markA : fresh.markB}) beginnt.`)
      next.push('')
      next.push(...formatBoard(fresh.board))
      next.push('')
      next.push(`Spieler ${first} ist am Zug. Beispiel: "a1", "b3", "set c2".`)
    } else if (lower === 'board' || lower === 'show') {
      if (game) {
        next.push('')
        next.push(...formatBoard(game.board))
        next.push('')
        const mark = game.turn === 'A' ? game.markA : game.markB
        next.push(`Spieler ${game.turn} (${mark}) ist am Zug.`)
      } else {
        next.push('Kein laufendes Spiel.')
      }
    } else if (lower === 'quit' || lower === 'exit' || lower === 'stop') {
      if (game) {
        setGame(null)
        next.push('Spiel abgebrochen.')
      } else {
        next.push('Kein laufendes Spiel.')
      }
    } else if (lower === 'help') {
      next.push('Verfügbare Befehle:')
      next.push('  help                     Zeigt diese Hilfe an')
      if (installed) {
        next.push('  3erReihe -start          Startet ein neues Spiel')
        next.push('  3erReihe -start -A|-B    Erzwingt den ersten Spieler')
        next.push('  <feld>                   Setzt einen Stein, z.B. a1, b3, set c2')
        next.push('  board / show             Zeigt das aktuelle Spielfeld')
        next.push('  quit / exit              Bricht das laufende Spiel ab')
      }
      next.push('  cls / clear              Leert das Terminal')
      next.push('  git clone <url>          Lädt das Projekt herunter (Simulation)')
      next.push('  cd 3erReihe              Wechselt in den Projektordner')
      next.push('  npm install              Installiert die Pakete (Simulation)')
      next.push('  npm run dev              Startet den Dev-Server (Simulation)')
    } else if (lower === 'cls' || lower === 'clear') {
      setCmdLines([])
      setCmdInput('')
      return
    } else if (game) {
      next.push(`"${raw}" ist kein Zug. Beispiel: "a1", "b3". Oder tippe "help".`)
    } else {
      next.push(`Der Befehl "${raw}" ist nicht bekannt. Tippe "help".`)
    }

    next.push('')
    setCmdLines(next)
    setCmdInput('')
  }
  //#endregion

  //#region Clock controls
  // MARK: Clock controls
  const displayTime = new Date(now.getTime() + timeOffsetSec * 1000)
  const hourDecimal =
    displayTime.getHours() +
    displayTime.getMinutes() / 60 +
    displayTime.getSeconds() / 3600
  const night = nightAmount(hourDecimal)
  const sky = skyColors(hourDecimal)
  const time = displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const simulated = timeOffsetSec !== 0

  const setClockTime = (h: number, m: number) => {
    const target = new Date(now)
    target.setHours(h, m, 0, 0)
    setTimeOffsetSec(Math.round((target.getTime() - now.getTime()) / 1000))
  }

  const resetClock = () => {
    setTimeOffsetSec(0)
    setClockOpen(false)
  }

  const togglePeriod = () => {
    const h = displayTime.getHours()
    setClockTime((h + 12) % 24, displayTime.getMinutes())
  }

  const time12 = (() => {
    const h = displayTime.getHours()
    const h12 = ((h + 11) % 12) + 1
    const mm = String(displayTime.getMinutes()).padStart(2, '0')
    return `${h12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`
  })()
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="desktop">
      <div className="desktop-screen">
        <div
          className="desktop-sky"
          aria-hidden="true"
          style={{
            background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 45%, ${sky.bot} 100%)`,
          }}
        >
          <div className="desktop-stars" style={{ opacity: night }}>
            {STARS.map((s, i) => (
              <span
                key={i}
                className="desktop-star"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          <span className="desktop-sun" style={{ opacity: 1 - night }} />
          <span className="desktop-moon" style={{ opacity: night }} />

          <div className="desktop-meteors" style={{ opacity: night }} aria-hidden="true">
            <span className="desktop-meteor desktop-meteor--1" />
            <span className="desktop-meteor desktop-meteor--2" />
            <span className="desktop-meteor desktop-meteor--3" />
            <span className="desktop-meteor desktop-meteor--4" />
          </div>

          <div className="desktop-clouds">
            {[0, 1].map((copy) => (
              <div className="desktop-clouds-track" key={copy}>
                <span className="desktop-cloud desktop-cloud--a" />
                <span className="desktop-cloud desktop-cloud--b" />
                <span className="desktop-cloud desktop-cloud--c" />
                <span className="desktop-cloud desktop-cloud--d" />
              </div>
            ))}
          </div>

          <span
            className="desktop-hill desktop-hill--far"
            style={{ filter: `brightness(${1 - night * 0.5}) saturate(${1 - night * 0.3})` }}
          />
          <span
            className="desktop-hill desktop-hill--near"
            style={{ filter: `brightness(${1 - night * 0.5}) saturate(${1 - night * 0.3})` }}
          />
        </div>

        <div className="desktop-icons">
          <button
            type="button"
            className="desktop-icon"
            onClick={() => {
              setFolderOpen(true)
              activate('folder')
              setStartOpen(false)
            }}
          >
            <span className="desktop-icon-art desktop-icon-art--folder" aria-hidden="true" />
            <span className="desktop-icon-label">{t('admin.3')}</span>
          </button>

          <LocalizedLink to="/" className="desktop-icon">
            <span className="desktop-icon-art desktop-icon-art--globe" aria-hidden="true" />
            <span className="desktop-icon-label">{t('admin.back')}</span>
          </LocalizedLink>
        </div>

        <div className="desktop-window-layer">
          {folderOpen && (
            <DraggableWindow
              title={t('admin.3')}
              kind="folder"
              initial={{ x: -260, y: -60 }}
              zIndex={windowZ.folder}
              onActivate={() => activate('folder')}
              onClose={() => setFolderOpen(false)}
            >
              <div className="desktop-window-body desktop-window-body--explorer">
                <div className="desktop-explorer-bar">{t('admin.3')}</div>
                <div className="desktop-explorer-grid">
                  <button
                    type="button"
                    className="desktop-explorer-item"
                    onClick={() => {
                      setReadmeOpen(true)
                      activate('readme')
                    }}
                  >
                    <span
                      className="desktop-explorer-icon desktop-explorer-icon--txt"
                      aria-hidden="true"
                    />
                    <span className="desktop-explorer-label">README.txt</span>
                  </button>
                </div>
              </div>
            </DraggableWindow>
          )}

          {readmeOpen && (
            <DraggableWindow
              title={t('admin.readme.editorTitle')}
              kind="txt"
              initial={{ x: 220, y: 20 }}
              zIndex={windowZ.readme}
              onActivate={() => activate('readme')}
              onClose={() => setReadmeOpen(false)}
            >
              <div className="desktop-window-body desktop-window-body--notepad">
                <pre className="desktop-notepad">{readmeText}</pre>
              </div>
            </DraggableWindow>
          )}

          {cmdOpen && (
            <DraggableWindow
              title={'C:\\'}
              kind="cmd"
              initial={{ x: 0, y: 100 }}
              zIndex={windowZ.cmd}
              onActivate={() => activate('cmd')}
              onClose={() => setCmdOpen(false)}
            >
              <div className="desktop-window-body desktop-window-body--cmd">
                <div className="desktop-cmd-output" ref={cmdOutputRef}>
                  {cmdLines.map((line, i) => (
                    <div key={i} className="desktop-cmd-line">
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
                <form className="desktop-cmd-form" onSubmit={submitCmd}>
                  <span className="desktop-cmd-prompt">{cwd}&gt;</span>
                  <input
                    ref={cmdInputRef}
                    className="desktop-cmd-input"
                    value={cmdInput}
                    onChange={(e) => setCmdInput(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    autoFocus
                    disabled={busy}
                  />
                </form>
              </div>
            </DraggableWindow>
          )}
        </div>

        {startOpen && (
          <>
            <div
              className="desktop-start-backdrop"
              onClick={() => setStartOpen(false)}
              aria-hidden="true"
            />
            <div className="desktop-startmenu" role="menu" aria-label={t('admin.start')}>
              <div className="desktop-startmenu-user">
                <span className="desktop-avatar" aria-hidden="true">
                  {name.charAt(0).toUpperCase()}
                </span>
                <div className="desktop-startmenu-usertext">
                  <p className="desktop-startmenu-name">{name}</p>
                  <p className="desktop-startmenu-role">
                    {t('admin.role')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="menuitem"
                className="desktop-startmenu-item"
                onClick={() => {
                  setFolderOpen(true)
                  activate('folder')
                  setStartOpen(false)
                }}
              >
                <span
                  className="desktop-startmenu-icon desktop-startmenu-icon--folder"
                  aria-hidden="true"
                />
                {t('admin.3')}
              </button>

              <button
                type="button"
                role="menuitem"
                className="desktop-startmenu-item"
                onClick={() => {
                  setCmdOpen(true)
                  activate('cmd')
                  setStartOpen(false)
                }}
              >
                <span
                  className="desktop-startmenu-icon desktop-startmenu-icon--cmd"
                  aria-hidden="true"
                />
                cmd
              </button>

              <LocalizedLink
                to="/"
                role="menuitem"
                className="desktop-startmenu-item desktop-startmenu-item--back"
              >
                <span
                  className="desktop-startmenu-icon desktop-startmenu-icon--back"
                  aria-hidden="true"
                />
                {t('admin.back')}
              </LocalizedLink>
            </div>
          </>
        )}

        {clockOpen && (
          <>
            <div
              className="desktop-clock-backdrop"
              onClick={() => setClockOpen(false)}
              aria-hidden="true"
            />
            <div
              className="desktop-clock-panel"
              role="dialog"
              aria-label={t('admin.adjustTime')}
            >
              <p className="desktop-clock-title">{t('admin.adjustTime')}</p>

              <AnalogClock
                hour={displayTime.getHours()}
                minute={displayTime.getMinutes()}
                onChange={setClockTime}
              />

              <button
                type="button"
                className="desktop-clock-readout"
                onClick={togglePeriod}
                title={t('admin.toggleAmPm')}
              >
                {time12}
              </button>

              <button
                type="button"
                className="desktop-clock-btn desktop-clock-btn--ghost"
                onClick={resetClock}
              >
                {t('admin.live')}
              </button>
            </div>
          </>
        )}

        <div className="desktop-taskbar">
          <button
            type="button"
            className={`desktop-start${startOpen ? ' is-open' : ''}`}
            onClick={() => setStartOpen((s) => !s)}
            aria-haspopup="menu"
            aria-expanded={startOpen}
          >
            <span className="desktop-flag" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            {t('admin.start')}
          </button>

          {folderOpen && (
            <button
              type="button"
              className="desktop-task"
              onClick={() => {
                setFolderOpen(false)
                setStartOpen(false)
              }}
            >
              <span
                className="desktop-window-icon desktop-window-icon--folder"
                aria-hidden="true"
              />
              {t('admin.3')}
            </button>
          )}

          {readmeOpen && (
            <button
              type="button"
              className="desktop-task"
              onClick={() => {
                setReadmeOpen(false)
                setStartOpen(false)
              }}
            >
              <span className="desktop-window-icon desktop-window-icon--txt" aria-hidden="true" />
              README.txt
            </button>
          )}

          {cmdOpen && (
            <button
              type="button"
              className="desktop-task"
              onClick={() => {
                setCmdOpen(false)
                setStartOpen(false)
              }}
            >
              <span className="desktop-window-icon desktop-window-icon--cmd" aria-hidden="true" />
              C:\
            </button>
          )}

          <button
            type="button"
            className={`desktop-tray${simulated ? ' is-simulated' : ''}`}
            onClick={() => setClockOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={clockOpen}
            title={t('admin.adjustTime')}
          >
            {time}
          </button>
        </div>
      </div>
    </div>
  )
  //#endregion
}
//#endregion