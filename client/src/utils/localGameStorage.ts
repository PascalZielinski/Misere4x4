import type { Side } from '../game/firstTurn'

const KEY = 'misere4x4:local-game'

export type Mark = 'X' | 'O'
export type Move = { side: Side; index: number }

export type SavedGame = {
  playerA: string
  playerB: string
  markA: Mark
  markB: Mark
  firstPlayer: Side
  turn: Side
  board: (Mark | null)[]
  moves: Move[]
  startedAt: number | null
  scoreA: number
  scoreB: number
  draws: number
}

const num = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0)

function parseBoard(raw: unknown): (Mark | null)[] {
  if (Array.isArray(raw) && raw.length === 16) {
    return raw.map((c) => (c === 'X' || c === 'O' ? c : null))
  }
  return Array<Mark | null>(16).fill(null)
}

function parseMoves(raw: unknown): Move[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (m) =>
        (m?.side === 'A' || m?.side === 'B') &&
        Number.isInteger(m?.index) &&
        m.index >= 0 &&
        m.index < 16,
    )
    .map((m) => ({ side: m.side as Side, index: m.index as number }))
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.playerA === 'string' && typeof parsed?.playerB === 'string') {
      const swapped = parsed.markA === 'O' && parsed.markB === 'X'
      const firstPlayer: Side = parsed.firstPlayer === 'B' ? 'B' : 'A'
      return {
        playerA: parsed.playerA.slice(0, 12),
        playerB: parsed.playerB.slice(0, 12),
        markA: swapped ? 'O' : 'X',
        markB: swapped ? 'X' : 'O',
        firstPlayer,
        turn: parsed.turn === 'A' || parsed.turn === 'B' ? parsed.turn : firstPlayer,
        board: parseBoard(parsed.board),
        moves: parseMoves(parsed.moves),
        startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
        scoreA: num(parsed.scoreA),
        scoreB: num(parsed.scoreB),
        draws: num(parsed.draws),
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(game))
  } catch {
    
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    
  }
}