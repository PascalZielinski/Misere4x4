import type { Mark, Move, SavedGame } from '../utils/localGameStorage'
import type { Side } from './firstTurn'

export const SIZE = 4
const ROW_LETTERS = ['a', 'b', 'c', 'd']

export function emptyBoard(): (Mark | null)[] {
  return Array<Mark | null>(SIZE * SIZE).fill(null)
}

// Startzustand eines neuen Spiels
export function newGameState(firstPlayer: Side) {
  return { board: emptyBoard(), turn: firstPlayer, moves: [] as Move[] }
}

// Feldindex (0-15) -> "a 4" (Buchstabe = Reihe, Zahl = Spalte)
export function cellLabel(index: number): string {
  return `${ROW_LETTERS[Math.floor(index / SIZE)]} ${(index % SIZE) + 1}`
}

// Gibt den neuen Spielstand zurück oder null, wenn der Zug nicht möglich ist
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