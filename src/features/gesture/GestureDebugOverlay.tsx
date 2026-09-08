import { useEffect, useRef } from 'react'
import type { PresentationMode } from '../presentation/commands'
import type { SlideCacheDebug } from '../presentation/useSlidePageCache'
import type { GestureRuntimeSnapshot } from './cameraStatus'

type Props = {
  snapshot: GestureRuntimeSnapshot
  presentationMode: PresentationMode
  pointerModeEnabled: boolean
  slideCacheDebug?: SlideCacheDebug | null
  isBlackScreen?: boolean
}

function phaseLabel(snapshot: GestureRuntimeSnapshot): string {
  if (snapshot.heldGesture === 'fist') return 'Fist (hold)'
  if (snapshot.heldGesture === 'ok') return 'OK Sign (hold)'
  if (snapshot.phase === 'swipe_candidate') return 'Swipe Candidate'
  if (snapshot.phase === 'pan') return 'Pan'
  if (snapshot.phase === 'cooldown') return 'Cooldown'
  if (snapshot.phase === 'gesture_hold') return 'Confirmed Hold'
  if (snapshot.phase === 'tracking') return 'Tracking'
  return 'Idle'
}

export function GestureDebugOverlay({
  snapshot,
  presentationMode,
  pointerModeEnabled,
  slideCacheDebug,
  isBlackScreen = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const landmarks = snapshot.landmarks
    if (!landmarks?.length) return

    ctx.strokeStyle = '#4ade80'
    ctx.fillStyle = '#4ade80'
    for (const point of landmarks) {
      const x = point.x * canvas.width
      const y = point.y * canvas.height
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [snapshot.landmarks])

  return (
    <aside className="gesture-debug-overlay" aria-label="Gesture debug">
      <h2>Gesture Debug</h2>
      <p>Camera: {snapshot.cameraStatus}</p>
      <p>Hand: {snapshot.handDetected ? 'Detected' : 'Not detected'}</p>
      <p>Zoom: {presentationMode}</p>
      <p>Black Screen: {isBlackScreen ? 'ON' : 'OFF'}</p>
      <p>Gesture: {phaseLabel(snapshot)}</p>
      <p>Last command: {snapshot.lastCommand ?? '—'}</p>
      <p>Cooldown: {Math.ceil(snapshot.cooldownRemainingMs)} ms</p>
      <p>
        Hand pos:{' '}
        {snapshot.handX != null && snapshot.handY != null
          ? `${snapshot.handX.toFixed(3)}, ${snapshot.handY.toFixed(3)}`
          : '—'}
      </p>
      <p>Swipe dx: {snapshot.swipeDx.toFixed(3)} ({snapshot.swipeSamples})</p>
      <p>Pointer mode: {pointerModeEnabled ? 'ON' : 'OFF'}</p>
      <p>Pointer visible: {snapshot.pointerVisible ? 'yes' : 'no'}</p>
      <p>
        Pointer pos:{' '}
        {snapshot.pointerX != null && snapshot.pointerY != null
          ? `${snapshot.pointerX.toFixed(3)}, ${snapshot.pointerY.toFixed(3)}`
          : '—'}
      </p>
      <p>Inference: {snapshot.inferenceFps.toFixed(1)} fps</p>
      {slideCacheDebug ? (
        <>
          <p>
            Slide cache:{' '}
            {slideCacheDebug.cachedPages.length
              ? slideCacheDebug.cachedPages.join(', ')
              : '—'}
          </p>
          <p>Slide ready: {slideCacheDebug.currentReady ? 'yes' : 'no'}</p>
          <p>
            Last render:{' '}
            {slideCacheDebug.lastRenderMs != null
              ? `${slideCacheDebug.lastRenderMs} ms`
              : '—'}
          </p>
        </>
      ) : null}
      <canvas ref={canvasRef} className="gesture-debug-overlay__canvas" width={160} height={120} />
    </aside>
  )
}
