//#region Imports
// MARK: - Imports
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import LocalizedLink from '../components/LocalizedLink'
import crown from '../assets/crown-svgrepo-com.svg'
import sketchUrl from '../assets/Screenshot 2026-10-28 223508.png'
import selectUrl from '../assets/select_001.ogg'
import dropXUrl from '../assets/drop_001.ogg'
import dropOUrl from '../assets/drop_003.ogg'
import { getSoundGain } from '../utils/audioSettings'
import { getRoom, placeRoomMark, PrivateRoomApiError, restartRoom, type PrivateRoomState, type RoomSide } from '../api/privateRooms'
import { cellLabel } from '../game/placement'
import { pillAngles } from '../game/result'
import { useFirstTurnSpin } from '../game/firstTurn'
import './localgamepage.css'
import './PrivateRoomGamePage.css'
//#endregion

//#region Board and audio configuration
// MARK: - Board and audio configuration
const ROWS = ['A', 'B', 'C', 'D']
const COLS = [1, 2, 3, 4]

const dropXSound = new Audio(dropXUrl)
const dropOSound = new Audio(dropOUrl)
const hoverSound = new Audio(selectUrl)
const BASE_VOLUME = 0.4

function play(sound: HTMLAudioElement) {
  const gain = getSoundGain()
  if (gain === 0) return
  sound.volume = BASE_VOLUME * gain
  sound.currentTime = 0
  sound.play().catch(() => {})
}
//#endregion

//#region Local score storage
// MARK: - Local score storage
type LocalScore = { a: number; b: number; draws: number; lastRound: number }
const emptyScore: LocalScore = { a: 0, b: 0, draws: 0, lastRound: 0 }

function scoreKey(code: string): string {
  return `misere4x4:private-room-score:${code}`
}

function readScore(code: string): LocalScore {
  try {
    const raw = localStorage.getItem(scoreKey(code))
    if (!raw) return emptyScore
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return emptyScore
    const score = value as Record<string, unknown>
    return {
      a: Number.isInteger(score.a) && Number(score.a) >= 0 ? Number(score.a) : 0,
      b: Number.isInteger(score.b) && Number(score.b) >= 0 ? Number(score.b) : 0,
      draws: Number.isInteger(score.draws) && Number(score.draws) >= 0 ? Number(score.draws) : 0,
      lastRound:
        Number.isInteger(score.lastRound) && Number(score.lastRound) >= 0
          ? Number(score.lastRound)
          : 0,
    }
  } catch {
    return emptyScore
  }
}
//#endregion

//#region Private room game page
// MARK: - Private room game page
export default function PrivateRoomGamePage() {
  //#region Game state
  // MARK: Game state
  const { t } = useTranslation()
  const { lang, code = '' } = useParams()
  const navigate = useNavigate()
  const [loadedRoom, setLoadedRoom] = useState<{ key: string; state: PrivateRoomState } | null>(null)
  const [scoreOverride, setScoreOverride] = useState<{ key: string; value: LocalScore } | null>(null)
  const [error, setError] = useState<'expired' | 'unauthorized' | 'load' | 'move' | 'score' | null>(null)
  const [busy, setBusy] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [spinningRound, setSpinningRound] = useState<number | null>(null)
  const [resultShownRound, setResultShownRound] = useState<number | null>(null)
  const spunRound = useRef<number | null>(null)
  const observedGame = useRef<{
    key: string
    round: number
    moveCount: number
    board: PrivateRoomState['game']['board']
  } | null>(null)
  const expiredRefresh = useRef(false)
  const scoreRef = useRef<{ key: string; value: LocalScore } | null>(null)
  const { shown, finished, spin, cancel } = useFirstTurnSpin()
  const roomKey = code
  const room = loadedRoom?.key === roomKey ? loadedRoom.state : null
  const roomScoreKey = scoreKey(code)
  const storedScore = useMemo(() => readScore(code), [code])
  const score = scoreOverride?.key === roomScoreKey ? scoreOverride.value : storedScore
  //#endregion

  //#region Room state synchronization
  // MARK: Room state synchronization
  const applyRoomState = useCallback((state: PrivateRoomState) => {
    const previousGame = observedGame.current
    const isNewerGame =
      !previousGame ||
      previousGame.key !== roomKey ||
      state.game.round > previousGame.round ||
      (state.game.round === previousGame.round &&
        state.game.moves.length > previousGame.moveCount)

    if (
      previousGame?.key === roomKey &&
      state.game.round === previousGame.round &&
      state.game.moves.length > previousGame.moveCount
    ) {
      const opponentMark = state.playerSide === 'A' ? 'O' : 'X'
      const opponentMoved = state.game.board.some(
        (mark, index) => previousGame.board[index] === null && mark === opponentMark,
      )
      if (opponentMoved) play(opponentMark === 'X' ? dropXSound : dropOSound)
    }

    if (isNewerGame) {
      observedGame.current = {
        key: roomKey,
        round: state.game.round,
        moveCount: state.game.moves.length,
        board: state.game.board,
      }
    }

    setLoadedRoom({ key: roomKey, state })
    setRemainingSeconds(Math.max(0, Math.ceil((new Date(state.expiresAt).getTime() - Date.now()) / 1000)))

    if (
      state.game.status === 'playing' &&
      state.game.moves.length === 0 &&
      state.game.firstPlayer &&
      spunRound.current !== state.game.round
    ) {
      spunRound.current = state.game.round
      setSpinningRound(state.game.round)
      spin(state.game.firstPlayer, () => setSpinningRound(null))
    }

    if (state.game.status !== 'lost' && state.game.status !== 'draw') return
    const currentScore =
      scoreRef.current?.key === roomScoreKey ? scoreRef.current.value : readScore(code)
    if (state.game.round <= currentScore.lastRound) return

    const nextScore: LocalScore = {
      ...currentScore,
      a: currentScore.a + (state.game.result.winner === 'A' ? 1 : 0),
      b: currentScore.b + (state.game.result.winner === 'B' ? 1 : 0),
      draws: currentScore.draws + (state.game.status === 'draw' ? 1 : 0),
      lastRound: state.game.round,
    }
    scoreRef.current = { key: roomScoreKey, value: nextScore }
    setScoreOverride({ key: roomScoreKey, value: nextScore })
    try {
      localStorage.setItem(roomScoreKey, JSON.stringify(nextScore))
    } catch {
      setError('score')
    }
  }, [code, roomKey, roomScoreKey, spin])

  const loadRoom = useCallback(async () => {
    try {
      const state = await getRoom(code)
      setError(null)
      applyRoomState(state)
    } catch (requestError) {
      if (requestError instanceof PrivateRoomApiError && requestError.status === 401) {
        setError('unauthorized')
      } else if (requestError instanceof PrivateRoomApiError &&
        (requestError.status === 404 || requestError.status === 410)) {
        setError('expired')
      } else {
        setError('load')
      }
    }
  }, [applyRoomState, code])
  //#endregion

  //#region Room lifecycle
  // MARK: Room lifecycle
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRoom(), 0)
    return () => {
      window.clearTimeout(timer)
      cancel()
    }
  }, [loadRoom, cancel])

  useEffect(() => {
    expiredRefresh.current = false
    spunRound.current = null
  }, [code])

  const mercureUrl = room?.mercureUrl
  const topic = room?.topic
  const mercureToken = room?.mercureToken
  useEffect(() => {
    if (!mercureUrl || !topic || !mercureToken) return
    const url = new URL(mercureUrl)
    url.searchParams.append('match', topic)
    const controller = new AbortController()
    let reconnectTimer: number | undefined

    const subscribe = async () => {
      while (!controller.signal.aborted) {
        try {
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${mercureToken}` },
            signal: controller.signal,
          })
          if (response.status === 401) {
            setError('load')
            return
          }
          if (!response.ok) {
            throw new Error(`Mercure subscription failed with status ${response.status}.`)
          }
          if (!response.body) throw new Error('Mercure subscription returned no response stream.')

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const messages = buffer.split(/\r?\n\r?\n/)
            buffer = messages.pop() ?? ''
            if (messages.some((message) => message.split(/\r?\n/).some((line) => line.startsWith('data:')))) {
              void loadRoom()
            }
          }
        } catch (subscriptionError) {
          if (controller.signal.aborted) return
          console.error('Mercure subscription failed; reconnecting.', subscriptionError)
        }

        await new Promise<void>((resolve) => {
          reconnectTimer = window.setTimeout(resolve, 1500)
        })
      }
    }

    void subscribe()
    return () => {
      controller.abort()
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
    }
  }, [mercureUrl, topic, mercureToken, loadRoom])

  const expiresAt = room?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const updateRemaining = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    }
    const firstTick = window.setTimeout(updateRemaining, 0)
    const interval = window.setInterval(updateRemaining, 250)
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(interval)
    }
  }, [expiresAt])

  useEffect(() => {
    if (!expiresAt || remainingSeconds === null || remainingSeconds > 0 || expiredRefresh.current) return
    expiredRefresh.current = true
    void loadRoom()
  }, [expiresAt, remainingSeconds, loadRoom])

  const status = room?.game.status
  const round = room?.game.round ?? null
  const over = status === 'lost' || status === 'draw'
  useEffect(() => {
    if (!over || round === null) return
    const timer = window.setTimeout(() => setResultShownRound(round), 1000)
    return () => window.clearTimeout(timer)
  }, [over, round])
  const showResult = over && resultShownRound === round
  //#endregion

  //#region Game actions
  // MARK: Game actions
  const doMove = async (index: number) => {
    if (!room || busy || spinningRound !== null) return
    setBusy(true)
    setError(null)
    try {
      const next = await placeRoomMark(code, index)
      play(next.game.board[index] === 'X' ? dropXSound : dropOSound)
      applyRoomState(next)
    } catch (requestError) {
      setError('move')
      if (requestError instanceof PrivateRoomApiError) void loadRoom()
    } finally {
      setBusy(false)
    }
  }

  const doRestart = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      applyRoomState(await restartRoom(code))
    } catch {
      setError('move')
    } finally {
      setBusy(false)
    }
  }
  //#endregion

  //#region Display state
  // MARK: Display state
  const playerName = (side: RoomSide | null) =>
    room?.participants.find((participant) => participant.side === side)?.name ?? ''

  const playerA = playerName('A') || t('privateRoom.game.playerA')
  const playerB = playerName('B') || t('privateRoom.game.playerB')
  const markA = 'X'
  const markB = 'O'

  const result = room?.game.result
  const winnerSide: RoomSide | null = room?.game.status === 'lost' ? (result?.winner ?? null) : null
  const angles: Record<number, number[]> =
    room?.game.status === 'lost' ? pillAngles(result?.chains ?? []) : {}

  const leaderSide: RoomSide | null =
    score.a > score.b ? 'A' : score.b > score.a ? 'B' : null

  const isMyTurn = room?.game.status === 'playing' && room.game.turn === room.playerSide
  const turnName = room?.game.turn === 'B' ? playerB : playerA
  const turnMark = room?.game.turn === 'B' ? markB : markA

  let turnText = ''
  let turnMarkShown: string | null = turnMark
  if (room) {
    if (room.game.status === 'lost') {
      turnText = t('privateRoom.game.winner', { name: playerName(winnerSide) })
      turnMarkShown = winnerSide === 'B' ? markB : markA
    } else if (room.game.status === 'draw') {
      turnText = t('privateRoom.game.draw')
      turnMarkShown = null
    } else {
      turnText = t(isMyTurn ? 'privateRoom.game.yourTurn' : 'privateRoom.game.opponentTurn', {
        name: turnName,
        mark: turnMark,
      })
    }
  }

  const blockingError = error === 'expired' || error === 'unauthorized' || error === 'load'
  const waiting = room?.game.status === 'waiting'
  const boardDisabled = (index: number) =>
    !room ||
    busy ||
    spinningRound !== null ||
    room.game.status !== 'playing' ||
    room.game.turn !== room.playerSide ||
    room.game.board[index] !== null

  const handleCellHover = (index: number) => {
    if (boardDisabled(index)) return
    play(hoverSound)
  }

  const crownImg = (
    <img src={crown} alt="" aria-hidden="true" className="panel-crown" />
  )
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="game-page">
      <NavBar />

      <main className="game-main">
        <aside className="rules-panel">
          <header className="rules-header">{t('local.rules.title')}</header>
          <ul className="rules-list">
            <li>{t('local.rules.rule1')}</li>
            <li>{t('local.rules.rule2')}</li>
            <li>{t('local.rules.rule3')}</li>
            <li>{t('local.rules.rule4')}</li>
          </ul>
          <figure className="rules-sketch">
            <a
              href="https://www.adesso.de/de/"
              target="_blank"
              rel="noopener noreferrer"
              className="rules-sketch-link"
              aria-label={t('local.rules.adessoAria')}
            >
              <img src={sketchUrl} alt={t('local.rules.sketchAlt')} />
            </a>
          </figure>
          <LocalizedLink to="/tutorial" className="rules-link">
            {t('local.rules.notUnderstood')}
          </LocalizedLink>
        </aside>

        <div className="game-row">
          <div className="board-col">
            <div className="board-area">
              <div />

              <div className="turn-panel-wrap" aria-live="polite">
                <div className={`turn-panel${room && !waiting ? '' : ' hidden'}`}>
                  <span key={`${room?.game.turn ?? 'none'}-${room?.game.status ?? 'none'}`} className="turn-text">
                    {turnText}
                  </span>
                  {turnMarkShown && (
                    <span className="mark-box" aria-hidden="true">{turnMarkShown}</span>
                  )}
                </div>
              </div>

              <div className="labels labels-left">
                {ROWS.map((row) => (
                  <span key={row}>{row}</span>
                ))}
              </div>

              <div className="board">
                {Array.from({ length: ROWS.length * COLS.length }).map((_, i) => {
                  const mark = room?.game.board[i] ?? null
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`cell${mark ? ` cell-${mark.toLowerCase()}` : ''}`}
                      onClick={() => void doMove(i)}
                      onMouseEnter={() => handleCellHover(i)}
                      disabled={boardDisabled(i)}
                      aria-disabled={mark !== null}
                      aria-label={
                        mark
                          ? t('local.cellTaken', { cell: cellLabel(i), mark })
                          : t('local.cell', { cell: cellLabel(i) })
                      }
                    >
                      {mark && <span className="cell-mark">{mark}</span>}
                      {(angles[i] ?? []).map((a, k) => (
                        <span
                          key={k}
                          className="cell-pill"
                          aria-hidden="true"
                          style={
                            {
                              '--angle': `${a}deg`,
                              '--len': a % 90 === 0 ? '72%' : '100%',
                            } as CSSProperties
                          }
                        />
                      ))}
                    </button>
                  )
                })}
              </div>

              <div />

              <div className="labels labels-bottom">
                {COLS.map((col) => (
                  <span key={col}>{col}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-wrap">
            <div className="panel-top-actions">
              <span className="private-code">
                {t('privateRoom.game.roomCode', { code: room?.code ?? code })}
              </span>
            </div>

            <aside className="panel">
              <header className="panel-title">
                <span className="mark-box" aria-label={t('local.playsMark', { name: playerA, mark: markA })}>
                  {markA}
                </span>
                <span className="panel-title-text">
                  {t('local.versus', { a: playerA, b: playerB })}
                </span>
                <span className="mark-box" aria-label={t('local.playsMark', { name: playerB, mark: markB })}>
                  {markB}
                </span>
              </header>

              <div className="panel-players">
                <span className="player-name">
                  {leaderSide === 'A' && crownImg}
                  {playerA}
                </span>
                <span className="player-name">
                  {playerB}
                  {leaderSide === 'B' && crownImg}
                </span>
              </div>

              <div className="panel-moves">
                <ol className="moves" aria-label={t('local.movesOf', { name: playerA })}>
                  {(room?.game.moves ?? [])
                    .filter((m) => m.side === 'A')
                    .map((m, i) => (
                      <li key={i}>
                        <span className="move-nr">{i + 1}.</span>
                        <span className="move-text">{cellLabel(m.index)}</span>
                      </li>
                    ))}
                </ol>
                <ol className="moves moves-b" aria-label={t('local.movesOf', { name: playerB })}>
                  {(room?.game.moves ?? [])
                    .filter((m) => m.side === 'B')
                    .map((m, i) => (
                      <li key={i}>
                        <span className="move-nr">{i + 1}.</span>
                        <span className="move-text">{cellLabel(m.index)}</span>
                      </li>
                    ))}
                </ol>
              </div>

              {room?.game.status === 'playing' && remainingSeconds !== null && (
                <footer className="private-timer">
                  {t('privateRoom.game.timeLeft', { seconds: remainingSeconds })}
                </footer>
              )}
            </aside>
          </div>
        </div>
      </main>

      {error && !blockingError && (
        <p className="private-toast" role="alert">
          {t(`privateRoom.game.errors.${error}`)}
        </p>
      )}

      {showResult && room && (
        <div className="result-overlay">
          <div className="result-card" role="dialog" aria-modal="true">
            {winnerSide ? (
              <>
                <div className="result-winner">
                  <div className="crown-slot" aria-hidden="true">
                    {leaderSide && leaderSide === winnerSide && (
                      <img src={crown} alt="" className="crown-img" />
                    )}
                  </div>
                  <span className="result-winner-name">
                    {winnerSide === 'A' ? playerA : playerB}
                  </span>
                  <span className="result-label">{t('local.result.won')}</span>
                </div>
                <div className="result-loser">
                  <span className="result-loser-name">
                    {winnerSide === 'A' ? playerB : playerA}
                  </span>
                  <span className="result-label">{t('local.result.lostLabel')}</span>
                </div>
              </>
            ) : (
              <div className="result-draw">
                <span className="result-draw-title">{t('local.draw')}</span>
                <span className="result-draw-names">{playerA} &amp; {playerB}</span>
              </div>
            )}

            <div className="result-score" aria-label={t('local.result.scoreAria')}>
              <span className="score-player">
                {playerA}
                {leaderSide === 'A' && <img src={crown} alt="" aria-hidden="true" className="score-crown" />}
              </span>
              <strong>{score.a} : {score.b}</strong>
              <span className="score-player">
                {playerB}
                {leaderSide === 'B' && <img src={crown} alt="" aria-hidden="true" className="score-crown" />}
              </span>
              {score.draws > 0 && <em>{t('local.result.draws', { count: score.draws })}</em>}
            </div>

            {room.matchmade ? (
              <div className="result-actions">
                <button
                  className="ov-btn ov-btn-primary"
                  onClick={() => navigate(`/${lang}/online/queue`, { replace: true })}
                  autoFocus
                >
                  {t('online.requeue')}
                </button>
                <LocalizedLink
                  to="/online"
                  className="ov-btn"
                >
                  {t('online.backToOnline')}
                </LocalizedLink>
              </div>
            ) : (
              <button
                className="ov-btn ov-btn-primary"
                onClick={() => void doRestart()}
                disabled={busy}
                autoFocus
              >
                {t('local.result.playAgain')}
              </button>
            )}
          </div>
        </div>
      )}

      {(blockingError || !room || waiting || spinningRound !== null) && (
        <div className="overlay">
          <div className="overlay-card" role={blockingError ? 'alert' : 'status'} aria-modal="true">
            {blockingError ? (
              <>
                <p className="ov-hint">{t(`privateRoom.game.errors.${error}`)}</p>
                {error === 'load' && (
                  <button type="button" className="ov-btn ov-btn-primary" onClick={() => void loadRoom()}>
                    {t('privateRoom.game.retry')}
                  </button>
                )}
                {(error === 'expired' || error === 'unauthorized') && (
                  <button
                    type="button"
                    className="ov-btn ov-btn-primary"
                    onClick={() =>
                      navigate(error === 'unauthorized' ? `/${lang}/online` : `/${lang}/online/private`)
                    }
                  >
                    {t(error === 'unauthorized' ? 'privateRoom.game.goOnline' : 'privateRoom.game.backToRooms')}
                  </button>
                )}
              </>
            ) : !room ? (
              <p className="ov-hint">{t('privateRoom.game.loading')}</p>
            ) : spinningRound !== null ? (
              <div className="ov-spin">
                <p className="ov-spin-text">{t('privateRoom.game.firstTurn')}</p>
                <p className={`ov-spin-name${finished ? ' final' : ''}`}>{playerName(shown)}</p>
              </div>
            ) : (
              <div className="ov-spin">
                <p className="ov-spin-text">{t('privateRoom.game.waiting')}</p>
                <p className="ov-spin-name final">{code}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
  //#endregion
}
//#endregion