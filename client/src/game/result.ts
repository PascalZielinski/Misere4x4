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

const inBoard = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE

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

function canStillMakeThree(board: (Mark | null)[]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      for (const { dr, dc } of DIRS) {
        if (!inBoard(r + 2 * dr, c + 2 * dc)) continue
        const marks = new Set<Mark>()
        for (let k = 0; k < 3; k++) {
          const m = board[(r + k * dr) * SIZE + (c + k * dc)]
          if (m) marks.add(m)
        }
        if (marks.size <= 1) return true
      }
    }
  }
  return false
}

export function getResult(game: SavedGame): GameResult {
  const last = game.moves[game.moves.length - 1]
  if (!last) return { status: 'playing' }

  const chains = chainsThrough(game.board, last.index)
  if (chains.length > 0) return { status: 'lost', loser: last.side, chains }

  if (!canStillMakeThree(game.board)) return { status: 'draw' }
  return { status: 'playing' }
}

export function pillAngles(chains: Chain[]): Record<number, number[]> {
  const out: Record<number, number[]> = {}
  for (const { cells, angle } of chains) {
    for (const i of cells) (out[i] ??= []).push(angle)
  }
  return out
}