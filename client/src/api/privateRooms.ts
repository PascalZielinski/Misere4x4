const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_SERVER as string | undefined) ?? ''
const USER_TOKEN_KEY = 'token'

export type RoomSide = 'A' | 'B'
export type RoomMark = 'X' | 'O'

export type PrivateRoomGame = {
  round: number
  status: 'waiting' | 'playing' | 'lost' | 'draw'
  firstPlayer: RoomSide | null
  turn: RoomSide | null
  board: (RoomMark | null)[]
  moves: { side: RoomSide; index: number }[]
  result: {
    status: 'waiting' | 'playing' | 'lost' | 'draw'
    loser?: RoomSide
    winner?: RoomSide
    chains?: { cells: number[]; angle: number }[]
  }
}

export type PrivateRoomState = {
  code: string
  roomUuid: string
  matchmade: boolean
  topic: string
  mercureUrl: string
  mercureToken: string
  playerSide: RoomSide
  participants: { side: RoomSide; name: string | null }[]
  game: PrivateRoomGame
  expiresAt: string
}

export class PrivateRoomApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'PrivateRoomApiError'
    this.status = status
  }
}

function isSide(value: unknown): value is RoomSide {
  return value === 'A' || value === 'B'
}

function isRoomState(value: unknown): value is PrivateRoomState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  const game = state.game
  if (!game || typeof game !== 'object') return false
  const gameState = game as Record<string, unknown>

  return (
    typeof state.code === 'string' &&
    typeof state.roomUuid === 'string' &&
    typeof state.matchmade === 'boolean' &&
    typeof state.topic === 'string' &&
    typeof state.mercureUrl === 'string' &&
    typeof state.mercureToken === 'string' &&
    isSide(state.playerSide) &&
    typeof state.expiresAt === 'string' &&
    Array.isArray(state.participants) &&
    Array.isArray(gameState.board) &&
    gameState.board.length === 16 &&
    Array.isArray(gameState.moves) &&
    typeof gameState.round === 'number' &&
    ['waiting', 'playing', 'lost', 'draw'].includes(String(gameState.status)) &&
    !!gameState.result &&
    typeof gameState.result === 'object'
  )
}

function token(): string {
  const value = sessionStorage.getItem(USER_TOKEN_KEY)
  if (!value) throw new PrivateRoomApiError('Sign in before creating or joining a room.', 401)
  return value
}

async function request(path: string, init?: RequestInit): Promise<PrivateRoomState> {
  const response = await fetch(`${API_BASE}/api/private-rooms${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token()}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const rotatedToken = response.headers.get('X-User-Token')
  if (rotatedToken) sessionStorage.setItem(USER_TOKEN_KEY, rotatedToken)

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    let message = `Room request failed with status ${response.status}.`
    if (
      payload !== null &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
    ) {
      message = payload.error
    }
    throw new PrivateRoomApiError(message, response.status)
  }
  if (!isRoomState(payload)) throw new Error('Room response has an invalid shape.')

  return payload
}

export function createRoom(): Promise<PrivateRoomState> {
  return request('', { method: 'POST' })
}

export function joinRoom(code: string): Promise<PrivateRoomState> {
  return request('/join', { method: 'POST', body: JSON.stringify({ code }) })
}

export function getRoom(code: string): Promise<PrivateRoomState> {
  return request(`/${encodeURIComponent(code)}`)
}

export function placeRoomMark(
  code: string,
  index: number,
): Promise<PrivateRoomState> {
  return request(`/${encodeURIComponent(code)}/moves`, {
    method: 'POST',
    body: JSON.stringify({ index }),
  })
}

export function restartRoom(code: string): Promise<PrivateRoomState> {
  return request(`/${encodeURIComponent(code)}/restart`, {
    method: 'POST',
  })
}
