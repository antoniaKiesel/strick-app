import { useEffect, useRef, useState } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const DOUBLE_TAP_ZOOM = 2.5
const DOUBLE_TAP_MS = 300

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Scrollbereich mit eigenem Pinch-Zoom. Statt die ganze Seite zu zoomen
// (Safari-Standard, würde auch die Leiste mitvergrößern), wird die Breite
// des Inhalts verändert: Inhalt mit width = zoom · 100 % lässt sich dann
// ganz normal nativ in beide Richtungen scrollen.
// Während des Pinchs wird direkt am DOM gearbeitet (kein React-Render pro
// touchmove), erst am Ende landet der Wert im State. children ist eine
// Render-Funktion ({ zoom, baseWidth }) => …, damit z. B. PDF-Seiten nach
// dem Zoomen schärfer nachrendern können.
function ZoomPane({ children, className = '' }) {
  const scrollerRef = useRef(null)
  const contentRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [baseWidth, setBaseWidth] = useState(0)
  const zoomRef = useRef(1)

  useEffect(() => {
    const scroller = scrollerRef.current
    const observer = new ResizeObserver(() =>
      setBaseWidth(scroller.clientWidth)
    )
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    let pinch = null
    let lastTap = { time: 0, x: 0, y: 0 }
    let tapStart = null

    // Zoom so setzen, dass der Inhaltspunkt (fx, fy) – gemessen bei
    // Zoom 1 – unter der Bildschirmposition (sx, sy) bleibt.
    function applyZoom(nextZoom, fx, fy, sx, sy) {
      zoomRef.current = nextZoom
      content.style.width = `${nextZoom * 100}%`
      scroller.scrollLeft = fx * nextZoom - sx
      scroller.scrollTop = fy * nextZoom - sy
    }

    function local(touchA, touchB) {
      const rect = scroller.getBoundingClientRect()
      return {
        x: (touchA.clientX + touchB.clientX) / 2 - rect.left,
        y: (touchA.clientY + touchB.clientY) / 2 - rect.top,
        distance: Math.hypot(
          touchA.clientX - touchB.clientX,
          touchA.clientY - touchB.clientY
        ),
      }
    }

    function onTouchStart(event) {
      if (event.touches.length === 2) {
        event.preventDefault()
        const { x, y, distance } = local(event.touches[0], event.touches[1])
        const z = zoomRef.current
        pinch = {
          distance,
          zoom: z,
          fx: (scroller.scrollLeft + x) / z,
          fy: (scroller.scrollTop + y) / z,
        }
        tapStart = null
      } else if (event.touches.length === 1) {
        const touch = event.touches[0]
        tapStart = { x: touch.clientX, y: touch.clientY, time: Date.now() }
      }
    }

    function onTouchMove(event) {
      if (pinch && event.touches.length === 2) {
        event.preventDefault()
        const { x, y, distance } = local(event.touches[0], event.touches[1])
        const next = clamp(
          (pinch.zoom * distance) / pinch.distance,
          MIN_ZOOM,
          MAX_ZOOM
        )
        applyZoom(next, pinch.fx, pinch.fy, x, y)
      } else if (tapStart) {
        const touch = event.touches[0]
        if (
          Math.hypot(touch.clientX - tapStart.x, touch.clientY - tapStart.y) >
          10
        ) {
          tapStart = null
        }
      }
    }

    function onTouchEnd(event) {
      if (pinch && event.touches.length < 2) {
        pinch = null
        setZoom(zoomRef.current)
        return
      }
      // Doppeltipp: zwischen Seitenbreite und Vergrößerung umschalten.
      if (tapStart && event.touches.length === 0) {
        const now = Date.now()
        const { x, y } = tapStart
        const isDouble =
          now - lastTap.time < DOUBLE_TAP_MS &&
          Math.hypot(x - lastTap.x, y - lastTap.y) < 30
        if (isDouble) {
          event.preventDefault()
          const rect = scroller.getBoundingClientRect()
          const sx = x - rect.left
          const sy = y - rect.top
          const z = zoomRef.current
          const next = z > 1.05 ? 1 : DOUBLE_TAP_ZOOM
          applyZoom(
            next,
            (scroller.scrollLeft + sx) / z,
            (scroller.scrollTop + sy) / z,
            sx,
            sy
          )
          setZoom(next)
          lastTap = { time: 0, x: 0, y: 0 }
        } else {
          lastTap = { time: now, x, y }
        }
      }
      tapStart = null
    }

    // Safari feuert zusätzlich eigene gesture*-Events für den Seitenzoom.
    const preventGesture = (event) => event.preventDefault()

    const active = { passive: false }
    scroller.addEventListener('touchstart', onTouchStart, active)
    scroller.addEventListener('touchmove', onTouchMove, active)
    scroller.addEventListener('touchend', onTouchEnd, active)
    scroller.addEventListener('touchcancel', onTouchEnd, active)
    scroller.addEventListener('gesturestart', preventGesture, active)
    scroller.addEventListener('gesturechange', preventGesture, active)
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchmove', onTouchMove)
      scroller.removeEventListener('touchend', onTouchEnd)
      scroller.removeEventListener('touchcancel', onTouchEnd)
      scroller.removeEventListener('gesturestart', preventGesture)
      scroller.removeEventListener('gesturechange', preventGesture)
    }
  }, [])

  return (
    <div ref={scrollerRef} className={`zoom-pane ${className}`}>
      <div
        ref={contentRef}
        className="zoom-pane-content"
        style={{ width: `${zoom * 100}%` }}
      >
        {children({ zoom, baseWidth })}
      </div>
    </div>
  )
}

export default ZoomPane
