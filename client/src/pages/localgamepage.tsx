import { useState } from 'react'
import './localgame.css'
import NavBar from '../components/NavBar'
import retryUrl from '../assets/retry-svgrepo-com.svg'
import { loadGame, saveGame, type SavedGame } from '../utils/localGameStorage'
import { pickFirstPlayer, useFirstTurnSpin } from '../game/firstTurn'
import { cellLabel, newGameState, placeAt } from '../game/placement'

const ROWS = ['A', 'B', 'C', 'D']
const COLS = [1, 2, 3, 4]

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

  const ready = nameA.trim() !== '' && nameB.trim() !== ''

  const [step, setStep] = useState<'menu' | 'new' | 'spin'>('menu')
  const [pending, setPending] = useState<SavedGame | null>(null)
  const { shown, finished, spin, cancel } = useFirstTurnSpin()

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
      ...newGameState(first), // board, turn, moves
      startedAt: Date.now(),
    }
    saveGame(next)
    setSaved(next)
    setPending(next)
    setStep('spin')
    spin(next.firstPlayer, () => setGame(next))
  }

  function loadSaved() {
    if (saved) setGame(saved)
  }

  function handleCell(index: number) {
    if (!game) return // solange das Overlay offen ist, kein Zug
    const next = placeAt(game, index)
    if (!next) return // Feld belegt
    saveGame(next)
    setSaved(next)
    setGame(next)
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

  return (
    <div className="game-page">
      <NavBar />

      <main className="game-main">
        <div className="game-layout">
          <div className="board-area">
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
                    disabled={!game || mark !== null}
                    aria-label={`Feld ${cellLabel(i)}${mark ? `, belegt mit ${mark}` : ''}`}
                  >
                    {mark}
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

          <div className="panel-wrap">
            <button className="retry-btn" onClick={openMenu} aria-label="Neues Spiel oder Spiel laden">
              <span
                className="retry-icon"
                style={{
                  WebkitMaskImage: `url("${retryUrl}")`,
                  maskImage: `url("${retryUrl}")`,
                }}
              />
            </button>

            <aside className="panel">
              <header className="panel-title">
                <span className="mark-box" aria-label={`${playerA} spielt ${markA}`}>{markA}</span>
                <span className="panel-title-text">
                  {playerA} vs {playerB}
                </span>
                <span className="mark-box" aria-label={`${playerB} spielt ${markB}`}>{markB}</span>
              </header>

              <div className="panel-players">
                <span className={`player-name${game?.turn === 'A' ? ' active' : ''}`}>{playerA}</span>
                <span className={`player-name${game?.turn === 'B' ? ' active' : ''}`}>{playerB}</span>
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