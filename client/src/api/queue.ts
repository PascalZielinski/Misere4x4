const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_SERVER as string | undefined) ?? ''
const USER_TOKEN_KEY = 'token'

export type QueueState = {
  status: 'idle' | 'waiting' | 'matched'
  queueCount?: number
  roomUuid?: string
}

export class QueueApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'QueueApiError'
    this.status = status
  }
}

async function request(method: 'GET' | 'POST' | 'DELETE'): Promise<QueueState> {
  const token = sessionStorage.getItem(USER_TOKEN_KEY)
  if (!token) throw new QueueApiError('Sign in before joining the queue.', 401)

  const response = await fetch(`${API_BASE}/api/queue`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Queue request failed with status ${response.status}.`
    throw new QueueApiError(message, response.status)
  }
  if (payload === null || typeof payload !== 'object') {
    throw new Error('Queue response has an invalid shape.')
  }

  const data = payload as Record<string, unknown>
  if (
    data.status !== 'idle' &&
    data.status !== 'waiting' &&
    data.status !== 'matched'
  ) {
    throw new Error('Queue response has an invalid shape.')
  }
  if (
    data.queueCount !== undefined &&
    (!Number.isInteger(data.queueCount) || Number(data.queueCount) < 0)
  ) {
    throw new Error('Queue response has an invalid shape.')
  }
  if (data.roomUuid !== undefined && typeof data.roomUuid !== 'string') {
    throw new Error('Queue response has an invalid shape.')
  }

  return {
    status: data.status,
    ...(typeof data.queueCount === 'number' ? { queueCount: data.queueCount } : {}),
    ...(typeof data.roomUuid === 'string' ? { roomUuid: data.roomUuid } : {}),
  }
}

export function joinQueue(): Promise<QueueState> {
  return request('POST')
}

export function getQueueStatus(): Promise<QueueState> {
  return request('GET')
}

export function leaveQueue(): Promise<QueueState> {
  return request('DELETE')
}
