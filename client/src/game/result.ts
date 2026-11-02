import type { Mark, SavedGame } from '../utils/localGameStorage'
import type { Side } from './firstTurn'
import { SIZE } from './placement'

type Dir = { dr: number; dc: number; angle: number }

const DIRS: Dir[] = [
  { dr: 0, dc: 1, angle: 0 },
  { dr: 1, dc: 0, angle: 90 },
  { dr: 1, dc: 1, angle: 45 },
  { dr: 1, dc: -1, angle: -45 },
]

export type Chain = { cells: number[]; angle: number }

export type GameResult =
  | { status: 'playing' }
  | { status: 'draw' }
  | { status: 'lost'; loser: Side; chains: Chain[] }

const WINDOWS: readonly number[] = [

  // waagerecht (8)
  0b1110_0000_0000_0000,
  0b0111_0000_0000_0000,
  0b0000_1110_0000_0000,
  0b0000_0111_0000_0000,
  0b0000_0000_1110_0000,
  0b0000_0000_0111_0000,
  0b0000_0000_0000_1110,
  0b0000_0000_0000_0111,

  // senkrecht (8)
  0b1000_1000_1000_0000,
  0b0100_0100_0100_0000,
  0b0010_0010_0010_0000,
  0b0001_0001_0001_0000,
  0b0000_1000_1000_1000,
  0b0000_0100_0100_0100,
  0b0000_0010_0010_0010,
  0b0000_0001_0001_0001,

  // diagonal \ (4)
  0b1000_0100_0010_0000,
  0b0100_0010_0001_0000,
  0b0000_1000_0100_0010,
  0b0000_0100_0010_0001,

  // diagonal / (4)
  0b0010_0100_1000_0000,
  0b0001_0010_0100_0000,
  0b0000_0010_0100_1000,
  0b0000_0001_0010_0100,
]

const inBoard = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE

const bitOf = (index: number) => 1 << (SIZE * SIZE - 1 - index)

function toMasks(board: (Mark | null)[]): Map<Mark, number> {
  const masks = new Map<Mark, number>()
  board.forEach((mark, i) => {
    if (mark) masks.set(mark, (masks.get(mark) ?? 0) | bitOf(i))
  })
  return masks
}

function hasThree(stones: number): boolean {
  return WINDOWS.some((w) => (stones & w) === w)
}

function canStillMakeThree(masks: Map<Mark, number>): boolean {
  const all = [...masks.values()]
  return WINDOWS.some((w) => all.filter((m) => (m & w) !== 0).length <= 1)
}

function chainsThrough(board: (Mark | null)[], index: number): Chain[] {
  const mark = board[index]
  if (!mark) return []

  const r = Math.floor(index / SIZE)
  const c = index % SIZE
  const chains: Chain[] = []

  for (const { dr, dc, angle } of DIRS) {
    const cells = [index]

    for (let rr = r + dr, cc = c + dc; inBoard(rr, cc) && board[rr * SIZE + cc] === mark; rr += dr, cc += dc) {
      cells.push(rr * SIZE + cc)
    }
    for (let rr = r - dr, cc = c - dc; inBoard(rr, cc) && board[rr * SIZE + cc] === mark; rr -= dr, cc -= dc) {
      cells.unshift(rr * SIZE + cc)
    }

    if (cells.length >= 3) chains.push({ cells, angle })
  }

  return chains
}

export function getResult(game: SavedGame): GameResult {
  const last = game.moves[game.moves.length - 1]
  if (!last) return { status: 'playing' }

  const masks = toMasks(game.board)
  const lastMark = game.board[last.index]

  if (lastMark && hasThree(masks.get(lastMark) ?? 0)) {
    return { status: 'lost', loser: last.side, chains: chainsThrough(game.board, last.index) }
  }

  if (!canStillMakeThree(masks)) return { status: 'draw' }
  return { status: 'playing' }
}

export function pillAngles(chains: Chain[]): Record<number, number[]> {
  const out: Record<number, number[]> = {}
  for (const { cells, angle } of chains) {
    for (const i of cells) (out[i] ??= []).push(angle)
  }
  return out
}