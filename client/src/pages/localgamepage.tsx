import { useEffect, useState } from 'react'
import './localgamepage.css'
import NavBar from '../components/NavBar'
import retryUrl from '../assets/retry-svgrepo-com.svg'
import { loadGame, saveGame, type SavedGame } from '../utils/localGameStorage'
import { pickFirstPlayer, useFirstTurnSpin } from '../game/firstTurn'
import { cellLabel, newGameState, placeAt } from '../game/placement'
import { getResult, pillAngles } from '../game/result'
import selectUrl from '../assets/select_001.ogg'
import { getSoundGain } from '../utils/audioSettings'
import backUrl from '../assets/back_001.ogg'
import dropXUrl from '../assets/drop_001.ogg'
import dropOUrl from '../assets/drop_003.ogg'

const ROWS = ['A', 'B', 'C', 'D']
const COLS = [1, 2, 3, 4]

const dropXSound = new Audio(dropXUrl)
const dropOSound = new Audio(dropOUrl)
const hoverSound = new Audio(selectUrl)
const blockedSound = new Audio(backUrl)

const BASE_VOLUME = 0.4

function play(sound: HTMLAudioElement) {
  const gain = getSoundGain()
  if (gain === 0) return
  sound.volume = BASE_VOLUME * gain
  sound.currentTime = 0
  sound.play().catch(() => {})
}

function formatStart(ts: number | null): string {
  if (ts === null) return 'unbekannt'
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LocalGame() {
  const [saved, setSaved] = useState<SavedGame | null>(loadGame)

  const [game, setGame] = useState<SavedGame | null>(null)
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')

  const result = game ? getResult(game) : null
  const over = result !== null && result.status !== 'playing'
  const angles = result?.status === 'lost' ? pillAngles(result.chains) : {}

  const ready = nameA.trim() !== '' && nameB.trim() !== ''

  const [step, setStep] = useState<'menu' | 'new' | 'spin'>('menu')
  const [pending, setPending] = useState<SavedGame | null>(null)
  const { shown, finished, spin, cancel } = useFirstTurnSpin()

  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    setIsShaking(false)
    if (!game || over) return

    const timer = setTimeout(() => {
      setIsShaking(true)
    }, 10000)

    return () => clearTimeout(timer)
  }, [game?.turn, game?.moves.length, over])

  function startNew(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    const first = pickFirstPlayer()
    const next: SavedGame = {
      playerA: nameA.trim(),
      playerB: nameB.trim(),
      markA: 'X',
      markB: 'O',
      firstPlayer: first,
      ...newGameState(first),
      startedAt: Date.now(),
    }
    saveGame(next)
    setSaved(next)
    setPending(next)
    setStep('spin')
    spin(next.firstPlayer, () => setGame(next))
  }

  function fastReset() {
    if (!game) return
    setNameA(game.playerA)
    setNameB(game.playerB)
    
    const first = pickFirstPlayer()
    const next: SavedGame = {
      ...game,
      firstPlayer: first,
      ...newGameState(first),
      startedAt: Date.now(),
    }
    saveGame(next)
    setSaved(next)
    setGame(next)
  }

  function loadSaved() {
    if (saved) setGame(saved)
  }

  const playHover = () => play(hoverSound)
  const playBlocked = () => play(blockedSound)

  function handleCell(index: number) {
    if (!game || over) return
    const next = placeAt(game, index)
    if (!next) {
      playBlocked()
      return
    }

    const placedMark = next.board[index]
    play(placedMark === 'X' ? dropXSound : dropOSound)

    saveGame(next)
    setSaved(next)
    setGame(next)
  }

  function handleCellHover(index: number) {
    if (!game || over || game.board[index] !== null) return
    playHover()
  }

  function openMenu() {
    cancel()
    setPending(null)
    setStep('menu')
    setNameA('')
    setNameB('')
    setGame(null)
  }

  const playerA = game?.playerA ?? 'Spieler A'
  const playerB = game?.playerB ?? 'Spieler B'

  const markA = game?.markA ?? 'X'
  const markB = game?.markB ?? 'O'

  const turnName = game?.turn === 'B' ? playerB : playerA
  const turnMark = game?.turn === 'B' ? markB : markA

  let turnText = `${turnName} ist am Zug`
  let turnMarkShown: string | null = turnMark
  if (result?.status === 'lost') {
    turnText = `${result.loser === 'A' ? playerA : playerB} hat verloren`
    turnMarkShown = result.loser === 'A' ? markA : markB
  } else if (result?.status === 'draw') {
    turnText = 'Unentschieden'
    turnMarkShown = null
  }

  return (
    <div className="game-page">
      <NavBar />

      <main className="game-main">
        <div className="game-row">

          <div className="board-col">
            <div className="board-area">
              <div />

              <div className="turn-panel-wrap" aria-live="polite">
                <div className={`turn-panel${game ? '' : ' hidden'}${isShaking ? ' shaking' : ''}`}>
                  <span key={`${game?.turn ?? 'none'}-${result?.status ?? 'none'}`} className="turn-text">
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
                  const mark = game?.board[i] ?? null
                  return (
                      <button
                        key={i}
                        className={`cell${mark ? ` cell-${mark.toLowerCase()}` : ''}`}
                        onClick={() => handleCell(i)}
                        onMouseEnter={() => handleCellHover(i)}
                        disabled={!game || over}
                        aria-disabled={mark !== null}
                        aria-label={`Feld ${cellLabel(i)}${mark ? `, belegt mit ${mark}` : ''}`}
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
                            } as React.CSSProperties
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
            {/* NEU: Container für die Buttons oben rechts */}
            <div className="panel-top-actions">
              <button className="retry-btn" onClick={openMenu} aria-label="Neues Spiel oder Spiel laden">
                <span
                  className="retry-icon"
                  style={{
                    WebkitMaskImage: `url("${retryUrl}")`,
                    maskImage: `url("${retryUrl}")`,
                  }}
                />
              </button>
              {game && (
                <button className="fast-reset-btn" onClick={fastReset} aria-label="Schnellneustart">
                  Fast Reset
                </button>
              )}
            </div>

            <aside className="panel">
              <header className="panel-title">
                <span className="mark-box" aria-label={`${playerA} spielt ${markA}`}>{markA}</span>
                <span className="panel-title-text">
                  {playerA} vs. {playerB}
                </span>
                <span className="mark-box" aria-label={`${playerB} spielt ${markB}`}>{markB}</span>
              </header>

              <div className="panel-players">
                <span className="player-name">{playerA}</span>
                <span className="player-name">{playerB}</span>
              </div>

              <div className="panel-moves">
                <ol className="moves" aria-label={`Züge von ${playerA}`}>
                  {(game?.moves ?? [])
                    .filter((m) => m.side === 'A')
                    .map((m, i) => (
                      <li key={i}>
                        <span className="move-nr">{i + 1}.</span>
                        <span className="move-text">{cellLabel(m.index)}</span>
                      </li>
                    ))}
                </ol>
                <ol className="moves moves-b" aria-label={`Züge von ${playerB}`}>
                  {(game?.moves ?? [])
                    .filter((m) => m.side === 'B')
                    .map((m, i) => (
                      <li key={i}>
                        <span className="move-nr">{i + 1}.</span>
                        <span className="move-text">{cellLabel(m.index)}</span>
                      </li>
                    ))}
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {!game && (
        <div className="overlay">
          <div className="overlay-card" role="dialog" aria-modal="true">
            {step === 'menu' ? (
              <>
                <button className="ov-btn ov-btn-primary" onClick={() => setStep('new')}>
                  Neues Spiel
                </button>

                <button className="ov-btn ov-btn-primary" onClick={loadSaved} disabled={!saved}>
                  Spiel laden
                </button>

                {saved && (
                  <p className="ov-hint">
                    {saved.playerA} vs {saved.playerB}
                    <br />
                    Gestartet am {formatStart(saved.startedAt)}
                  </p>
                )}
              </>
            ) : step === 'spin' && pending ? (
              <div className="ov-spin">
                <p className="ov-spin-text">Der erste Zug geht an …</p>
                <p className={`ov-spin-name${finished ? ' final' : ''}`}>
                  {shown === 'B' ? pending.playerB : shown === 'A' ? pending.playerA : ''}
                </p>
              </div>
            ) : (
              <form className="ov-form" onSubmit={startNew}>
                <input
                  className="ov-input"
                  type="text"
                  placeholder="Spieler A"
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  maxLength={12}
                  autoFocus
                />
                <input
                  className="ov-input"
                  type="text"
                  placeholder="Spieler B"
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  maxLength={12}
                />

                <button
                  type="submit"
                  className={`ov-btn ov-start${ready ? ' ready' : ''}`}
                  disabled={!ready}
                >
                  Spiel starten
                </button>

                {saved && (
                  <p className="ov-hint">
                    Das Spiel {saved.playerA} vs {saved.playerB} (gestartet am{' '}
                    {formatStart(saved.startedAt)}) wird überschrieben.
                  </p>
                )}

                <button type="button" className="ov-back" onClick={() => setStep('menu')}>
                  Zurück
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}