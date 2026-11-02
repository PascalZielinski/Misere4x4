//#region Imports
// MARK: - Imports
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './localgamepage.css'
import './Tutorialpage.css'
import NavBar from '../components/NavBar'
import retryUrl from '../assets/retry-svgrepo-com.svg'
import crown from '../assets/crown-svgrepo-com.svg'
import { cellLabel } from '../game/placement'
import type { Mark } from '../utils/localGameStorage'
//#endregion

//#region Tutorial board data
// MARK: - Tutorial board data
const ROWS = ['A', 'B', 'C', 'D']
const COLS = [1, 2, 3, 4]

const TUTORIAL_BOARD: (Mark | null)[] = [
  'X', null, null, null,
  'O', null, 'X', null,
  null, 'X', 'O', null,
  null, null, 'O', null,
]

const TUTORIAL_MOVES = [
  { side: 'A' as const, index: 0 },
  { side: 'B' as const, index: 4 },
  { side: 'A' as const, index: 6 },
  { side: 'B' as const, index: 10 },
  { side: 'A' as const, index: 9 },
  { side: 'B' as const, index: 14 },
]

const CELL_A4 = 3
const CELL_B3 = 6
const CELL_C2 = 9
const CELL_C4 = 11
const WINNING_CELLS = [CELL_A4, CELL_B3, CELL_C2]

const WIN_PILL_STYLE = {
  '--len': 'var(--cell-size)',
  '--angle': '-45deg',
} as React.CSSProperties & Record<string, string>

type Placement = 'above' | 'below' | 'left' | 'right'

const STEP_PLACEMENTS: Placement[] = [
  'above',
  'below',
  'below',
  'left',
  'above',
  'below',
]

const FIRST_STEP = 0
const LAST_STEP = STEP_PLACEMENTS.length - 1
const FINISHED = -1
//#endregion

//#region Tutorial board helpers
// MARK: - Tutorial board helpers
function getBoardForStep(step: number): (Mark | null)[] {
  const board = [...TUTORIAL_BOARD]
  const s = step === FINISHED ? LAST_STEP : step
  if (s >= 4) board[CELL_C4] = 'O'
  if (s >= 5) board[CELL_A4] = 'X'
  return board
}
//#endregion

//#region Tooltip types
// MARK: - Tooltip types
interface TooltipStyle extends React.CSSProperties {
  '--arrow-x'?: string
  '--arrow-y'?: string
}

interface TutorialTooltipProps {
  targetRef: React.RefObject<HTMLElement>
  placement: Placement
  text: string
  isFirst: boolean
  isLast: boolean
  onNext: () => void
  onBack: () => void
}
//#endregion

//#region Tutorial page
// MARK: - Tutorial page
export default function TutorialPage() {
  //#region Tutorial state
  // MARK: Tutorial state
  const { t } = useTranslation()
  const [step, setStep] = useState<number>(FIRST_STEP)

  const turnPanelRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const cellC4Ref = useRef<HTMLButtonElement>(null)
  const cellA4Ref = useRef<HTMLButtonElement>(null)

  const targetRefs = [
    turnPanelRef,
    boardRef,
    retryRef,
    panelRef,
    cellC4Ref,
    cellA4Ref,
  ]

  const active = step >= FIRST_STEP && step <= LAST_STEP
  const showWinning = step >= 5 || step === FINISHED
  //#endregion

  //#region Tutorial lifecycle
  // MARK: Tutorial lifecycle
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
  //#endregion

  //#region Tutorial navigation
  // MARK: Tutorial navigation
  function goNext() {
    setStep((s) => (s >= LAST_STEP ? FINISHED : s + 1))
  }
  function goBack() {
    setStep((s) => (s > FIRST_STEP ? s - 1 : s))
  }
  function finish() {
    setStep(FINISHED)
  }
  //#endregion

  //#region Tutorial display state
  // MARK: Tutorial display state
  const playerA = t('local.playerA')
  const playerB = t('local.playerB')
  const markA: Mark = 'X'
  const markB: Mark = 'O'
  const scoreA = 1
  const scoreB = 2
  const leaderSide: 'A' | 'B' | null =
    scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null

  const movesA = TUTORIAL_MOVES.filter((m) => m.side === 'A')
  const movesB = TUTORIAL_MOVES.filter((m) => m.side === 'B')

  const board = getBoardForStep(step)

  const boardClass = [
    'board',
    step === 1 ? 'tutorial-highlight' : '',
    showWinning && active ? 'tutorial-raise' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const activeRef = active
    ? (targetRefs[step] as React.RefObject<HTMLElement>)
    : null
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div className="game-page">
      <NavBar />

      <main className="game-main">
        {active && <div className="tutorial-scrim" aria-hidden="true" />}

        {active && (
          <button type="button" className="tutorial-skip" onClick={finish}>
            {t('tutorial.skip')}
          </button>
        )}

        <div className="game-row">
          <div className="board-col">
            <div className="board-area">
              <div />

              <div className="turn-panel-wrap" aria-live="polite">
                <div
                  ref={turnPanelRef}
                  className={`turn-panel${step === 0 ? ' tutorial-highlight' : ''}`}
                >
                  <span className="turn-text">
                    {t('local.playerTurn', {
                      name: step === 4 ? playerB : playerA,
                    })}
                  </span>
                  <span className="mark-box" aria-hidden="true">
                    {step === 4 ? markB : markA}
                  </span>
                </div>
              </div>

              <div className="labels labels-left">
                {ROWS.map((row) => (
                  <span key={row}>{row}</span>
                ))}
              </div>

              <div ref={boardRef} className={boardClass}>
                {Array.from({ length: 16 }).map((_, i) => {
                  const mark = board[i]
                  const cellRef =
                    i === CELL_C4
                      ? cellC4Ref
                      : i === CELL_A4
                        ? cellA4Ref
                        : undefined

                  let extra = ''
                  if (step === 4 && i === CELL_C4) {
                    extra = ' tutorial-highlight'
                  } else if (step === 5 && i === CELL_A4) {
                    extra = ' tutorial-highlight'
                  }

                  const isWinningCell = showWinning && WINNING_CELLS.includes(i)

                  return (
                    <button
                      key={i}
                      ref={cellRef}
                      type="button"
                      className={`cell${mark ? ` cell-${mark.toLowerCase()}` : ''}${extra}`}
                      disabled
                      aria-label={
                        mark
                          ? t('local.cellTaken', { cell: cellLabel(i), mark })
                          : t('local.cell', { cell: cellLabel(i) })
                      }
                    >
                      {mark && <span className="cell-mark">{mark}</span>}
                      {isWinningCell && (
                        <span
                          className="cell-pill"
                          aria-hidden="true"
                          style={WIN_PILL_STYLE}
                        />
                      )}
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
              <button
                ref={retryRef}
                type="button"
                className={`retry-btn${step === 2 ? ' tutorial-highlight' : ''}`}
                aria-label={t('tutorial.quickRestart')}
                onClick={() => {}}
              >
                <span
                  className="retry-icon"
                  style={{
                    WebkitMaskImage: `url("${retryUrl}")`,
                    maskImage: `url("${retryUrl}")`,
                  }}
                />
              </button>
            </div>

            <aside
              ref={panelRef}
              className={`panel${step === 3 ? ' tutorial-highlight' : ''}`}
            >
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
                  {leaderSide === 'A' && (
                    <img src={crown} alt="" aria-hidden="true" className="panel-crown" />
                  )}
                  {playerA}
                </span>
                <span className="player-name">
                  {playerB}
                  {leaderSide === 'B' && (
                    <img src={crown} alt="" aria-hidden="true" className="panel-crown" />
                  )}
                </span>
              </div>

              <div className="panel-moves">
                <ol className="moves" aria-label={t('local.movesOf', { name: playerA })}>
                  {movesA.map((m, i) => (
                    <li key={i}>
                      <span className="move-nr">{i + 1}.</span>
                      <span className="move-text">{cellLabel(m.index)}</span>
                    </li>
                  ))}
                </ol>
                <ol className="moves moves-b" aria-label={t('local.movesOf', { name: playerB })}>
                  {movesB.map((m, i) => (
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

        {active && activeRef && (
          <TutorialTooltip
            key={step}
            targetRef={activeRef}
            placement={STEP_PLACEMENTS[step]}
            text={t(`tutorial.step${step + 1}`)}
            isFirst={step === FIRST_STEP}
            isLast={step === LAST_STEP}
            onNext={goNext}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  )
  //#endregion
}
//#endregion

//#region Tutorial tooltip
// MARK: - Tutorial tooltip
function TutorialTooltip({
  targetRef,
  placement,
  text,
  isFirst,
  isLast,
  onNext,
  onBack,
}: TutorialTooltipProps) {
  //#region Tooltip state
  // MARK: Tooltip state
  const { t } = useTranslation()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<TooltipStyle>({
    position: 'fixed',
    top: 0,
    left: 0,
    visibility: 'hidden',
  })
  //#endregion

  //#region Tooltip positioning
  // MARK: Tooltip positioning
  useLayoutEffect(() => {
    const target = targetRef.current
    const tooltip = tooltipRef.current
    if (!target || !tooltip) return

    const update = () => {
      const rect = target.getBoundingClientRect()
      const tRect = tooltip.getBoundingClientRect()
      const gap = 18
      const margin = 16
      const topMargin = 80
      const vw = window.innerWidth
      const vh = window.innerHeight

      let top = 0
      let left = 0

      if (placement === 'above') {
        left = rect.left + rect.width / 2 - tRect.width / 2
        top = rect.top - gap - tRect.height
      } else if (placement === 'below') {
        left = rect.left + rect.width / 2 - tRect.width / 2
        top = rect.bottom + gap
      } else if (placement === 'left') {
        left = rect.left - gap - tRect.width
        top = rect.top + rect.height / 2 - tRect.height / 2
      } else {
        left = rect.right + gap
        top = rect.top + rect.height / 2 - tRect.height / 2
      }

      left = Math.max(margin, Math.min(vw - tRect.width - margin, left))
      top = Math.max(topMargin, Math.min(vh - tRect.height - margin, top))

      let arrowX = '50%'
      let arrowY = '50%'
      if (placement === 'above' || placement === 'below') {
        const centerX = rect.left + rect.width / 2
        arrowX = `${Math.max(20, Math.min(tRect.width - 20, centerX - left))}px`
      } else {
        const centerY = rect.top + rect.height / 2
        arrowY = `${Math.max(20, Math.min(tRect.height - 20, centerY - top))}px`
      }

      setStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        visibility: 'visible',
        '--arrow-x': arrowX,
        '--arrow-y': arrowY,
      })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [targetRef, placement])
  //#endregion

  //#region Render
  // MARK: Render
  return (
    <div
      ref={tooltipRef}
      className={`tutorial-tooltip tutorial-tooltip--${placement}`}
      style={style}
      role="dialog"
      aria-modal="true"
    >
      <p className="tutorial-tooltip-text">{text}</p>
      <div className="tutorial-tooltip-actions">
        <button
          type="button"
          className="tutorial-btn tutorial-btn--back"
          onClick={onBack}
          disabled={isFirst}
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          className="tutorial-btn tutorial-btn--next"
          onClick={onNext}
          autoFocus
        >
          {isLast ? t('tutorial.done') : t('tutorial.next')}
        </button>
      </div>
      <span className="tutorial-tooltip-arrow" aria-hidden="true" />
    </div>
  )
  //#endregion
}
//#endregion