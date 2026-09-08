import {
  cameraStatusLabel,
  gestureAvailabilityLabel,
  type CameraStatus,
} from './cameraStatus'

type Props = {
  cameraStatus: CameraStatus
  gestureEnabled: boolean
  errorMessage: string | null
  onToggleGesture: () => void
}

export function CameraStatusBar({
  cameraStatus,
  gestureEnabled,
  errorMessage,
  onToggleGesture,
}: Props) {
  const statusClass =
    cameraStatus === 'error'
      ? 'camera-status--error'
      : cameraStatus === 'hand_detected'
        ? 'camera-status--active'
        : gestureEnabled
          ? 'camera-status--on'
          : 'camera-status--off'

  return (
    <div className={`camera-status ${statusClass}`}>
      <div className="camera-status__text">
        <span>{cameraStatusLabel(cameraStatus, gestureEnabled)}</span>
        <span>{gestureAvailabilityLabel(cameraStatus, gestureEnabled, errorMessage)}</span>
        {errorMessage ? <span className="camera-status__error">{errorMessage}</span> : null}
      </div>
      <button
        type="button"
        className="camera-status__toggle"
        onClick={onToggleGesture}
        aria-pressed={gestureEnabled}
      >
        {gestureEnabled ? 'Gesture OFF' : 'Gesture ON'}
      </button>
    </div>
  )
}
