import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import pumpkinSkin from '../assets/pumpkin1.png'
import pumpkinGlow from '../assets/pumpkin2.png'
import knifeSrc from '../assets/knife.svg'
import './PumpkinCarver.css'

type Point = { x: number; y: number }

const STORAGE_KEY = 'pumpkinCarved'
const WIDTH = 600
const CUT_WIDTH = 9
const MIN_STEP = 2
const CLOSE_DISTANCE = 40
const MIN_SHAPE_LENGTH = CLOSE_DISTANCE * 3
const SOUND_INTERVAL_MS = 120

const KNIFE_SIZE = 30
const KNIFE_HOTSPOT: Point = {
  x: (KNIFE_SIZE * 60) / 64,
  y: (KNIFE_SIZE * 60) / 64,
}

function playCarveSound() {

}
function playShapeRemovedSound() {

}

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function paint(canvas: HTMLCanvasElement, src: string, isCancelled: () => boolean = () => false) {
  const img = new Image()
  img.onload = () => {
    if (isCancelled()) return
    canvas.width = WIDTH
    canvas.height = Math.round((WIDTH * img.naturalHeight) / img.naturalWidth)
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }
  img.src = src
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function pathLength(pts: Point[]) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  return len
}

export default function PumpkinCarver() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<string | null>(readSaved)
  const [ratio, setRatio] = useState(1)
  const [knifeVisible, setKnifeVisible] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const knifeRef = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const points = useRef<Point[]>([])
  const lastSound = useRef(0)

  useEffect(() => {
    if (!open || !canvasRef.current) return
    let cancelled = false
    paint(canvasRef.current, readSaved() ?? pumpkinSkin, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setKnifeVisible(false)
    setOpen(false)
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const url = canvas.toDataURL('image/png')
      localStorage.setItem(STORAGE_KEY, url)
      setSaved(url)
    } catch {

    }
  }

  const retry = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {

    }
    setSaved(null)
    if (canvasRef.current) paint(canvasRef.current, pumpkinSkin)
  }

  const pos = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    }
  }

  const drawPreview = (from: Point, to: Point) => {
    const ctx = previewRef.current!.getContext('2d')!
    ctx.strokeStyle = '#fff3a0'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const clearPreview = () => {
    const p = previewRef.current
    if (p) p.getContext('2d')!.clearRect(0, 0, p.width, p.height)
  }

  const applyCut = (pts: Point[]) => {
    const canvas = canvasRef.current
    if (!canvas || pts.length === 0) return
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = CUT_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const path = pts.length === 1 ? [pts[0], pts[0]] : pts
    const isClosed =
      path.length > 2 &&
      pathLength(path) > MIN_SHAPE_LENGTH &&
      dist(path[0], path[path.length - 1]) < CLOSE_DISTANCE

    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y)

    if (isClosed) {
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      playShapeRemovedSound()
    } else {
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  const moveKnife = (e: PointerEvent<HTMLCanvasElement>) => {
    if (knifeRef.current) {
      knifeRef.current.style.transform = `translate(${e.clientX - KNIFE_HOTSPOT.x}px, ${e.clientY - KNIFE_HOTSPOT.y}px)`
    }
    setKnifeVisible(true)
  }

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const preview = previewRef.current!
    preview.width = canvasRef.current!.width
    preview.height = canvasRef.current!.height
    drawing.current = true
    points.current = [pos(e)]
  }

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    moveKnife(e)
    if (!drawing.current) return
    const p = pos(e)
    const prev = points.current[points.current.length - 1]
    if (dist(prev, p) < MIN_STEP) return
    points.current.push(p)
    drawPreview(prev, p)

    const now = performance.now()
    if (now - lastSound.current > SOUND_INTERVAL_MS) {
      lastSound.current = now
      playCarveSound()
    }
  }

  const onUp = () => {
    if (!drawing.current) return
    drawing.current = false
    applyCut(points.current)
    points.current = []
    clearPreview()
    save()
  }

  const overlay = (
    <div
      className="pumpkin-overlay"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        background: 'rgba(0, 0, 0, 0.88)',
      }}
    >
      <div
        className="pumpkin-stage"
        style={{
          position: 'relative',
          width: `min(90vw, 520px, ${70 * ratio}vh)`,
        }}
      >
        <img
          src={pumpkinGlow}
          alt=""
          draggable={false}
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
          style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 'none' }}
        />
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerEnter={moveKnife}
          onPointerLeave={() => setKnifeVisible(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: knifeVisible ? 'none' : 'crosshair',
          }}
        />
        <canvas
          ref={previewRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div className="pumpkin-actions" style={{ display: 'flex', gap: '1rem' }}>
        <button type="button" className="pumpkin-btn" onClick={retry}>
          {t('pumpkin.retry', 'Retry')}
        </button>
        <button type="button" className="pumpkin-btn pumpkin-btn--primary" onClick={close}>
          {t('pumpkin.done', 'Done')}
        </button>
      </div>

      <div
        ref={knifeRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1100,
          pointerEvents: 'none',
          display: knifeVisible ? 'block' : 'none',
        }}
      >
        <img
          src={knifeSrc}
          width={KNIFE_SIZE}
          height={KNIFE_SIZE}
          alt=""
          draggable={false}
          style={{
            display: 'block',
            filter: 'drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff)',
          }}
        />
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        className="pumpkin-mini"
        onClick={() => setOpen(true)}
        aria-label={t('pumpkin.open', 'Kürbis schnitzen')}
      >
        <img src={pumpkinGlow} alt="" draggable={false} />
        <img className="pumpkin-mini__skin" src={saved ?? pumpkinSkin} alt="" draggable={false} />
      </button>

      {open && createPortal(overlay, document.body)}
    </>
  )
}