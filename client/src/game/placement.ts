import type { Mark, Move, SavedGame } from '../utils/localGameStorage'
import type { Side } from './firstTurn'

export const SIZE = 4
const ROW_LETTERS = ['a', 'b', 'c', 'd']

export function emptyBoard(): (Mark | null)[] {
  return Array<Mark | null>(SIZE * SIZE).fill(null)
}

export function newGameState(firstPlayer: Side) {
  return { board: emptyBoard(), turn: firstPlayer, moves: [] as Move[] }
}

export function cellLabel(index: number): string {
  return `${ROW_LETTERS[Math.floor(index / SIZE)]} ${(index % SIZE) + 1}`
}

export function placeAt(game: SavedGame, index: number): SavedGame | null {
  if (!Number.isInteger(index) || index < 0 || index >= SIZE * SIZE) return null
  if (game.board[index] !== null) return null // Feld belegt

  const mark = game.turn === 'A' ? game.markA : game.markB
  const board = [...game.board]
  board[index] = mark

  return {
    ...game,
    board,
    moves: [...game.moves, { side: game.turn, index }],
    turn: game.turn === 'A' ? 'B' : 'A',
  }
}