import type { PresentationMode } from '../presentation/commands'
import type { GestureRuntimeSnapshot } from './cameraStatus'
import { cameraStatusLabel, gestureAvailabilityLabel } from './cameraStatus'

type Props = {
  snapshot: GestureRuntimeSnapshot
  presentationMode: PresentationMode
}

function phaseLabel(snapshot: GestureRuntimeSnapshot): string {
  if (snapshot.heldGesture === 'fist') return 'Fist'
  if (snapshot.heldGesture === 'ok') return 'OK Sign'
  if (snapshot.phase === 'pan') return 'Pan'
  if (snapshot.phase === 'swipe_candidate') return 'Swipe Candidate'
  if (snapshot.phase === 'gesture_hold') return 'Confirmed Hold'
  if (snapshot.phase === 'cooldown') return 'Cooldown'
  if (snapshot.phase === 'tracking') return 'Tracking'
  return 'Idle'
}

export function GestureDebugPanel({ snapshot, presentationMode }: Props) {
  const lastLabel = snapshot.panActive && snapshot.lastCommand !== 'PAN'
    ? `${snapshot.lastCommand ?? '—'} / PAN active`
    : snapshot.lastCommand ?? '—'

  return (
    <section className="gesture-debug">
      <p>Camera: {cameraStatusLabel(snapshot.cameraStatus, snapshot.gestureEnabled)}</p>
      <p>{gestureAvailabilityLabel(snapshot.cameraStatus, snapshot.gestureEnabled, snapshot.errorMessage)}</p>
      <p>Hand: {snapshot.handDetected ? 'Detected' : 'Not detected'}</p>
      <p>Mode: {presentationMode}</p>
      <p>Gesture: {phaseLabel(snapshot)}</p>
      <p>Swipe dx: {snapshot.swipeDx.toFixed(3)} ({snapshot.swipeSamples} samples)</p>
      <p>Cooldown: {Math.ceil(snapshot.cooldownRemainingMs)} ms</p>
      <p>Last command: {lastLabel}</p>
      {snapshot.errorMessage ? <p className="error">{snapshot.errorMessage}</p> : null}
    </section>
  )
}
