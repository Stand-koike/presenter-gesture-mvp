export type CameraStatus =
  | 'off'
  | 'starting'
  | 'ready'
  | 'hand_detected'
  | 'no_hand'
  | 'error'

export type GestureRuntimeSnapshot = {
  cameraStatus: CameraStatus
  gestureEnabled: boolean
  errorMessage: string | null
  handDetected: boolean
  inferenceFps: number
  cooldownRemainingMs: number
  handX: number | null
  handY: number | null
  phase: string
  heldGesture: 'ok' | 'fist' | null
  lastCommand: string | null
  swipeDx: number
  swipeSamples: number
  panActive: boolean
  landmarks: { x: number; y: number }[] | null
  pointerX: number | null
  pointerY: number | null
  pointerVisible: boolean
}

export function cameraStatusLabel(status: CameraStatus, gestureEnabled: boolean): string {
  if (!gestureEnabled) return 'Camera Off'
  switch (status) {
    case 'starting':
      return 'Camera Starting'
    case 'ready':
    case 'no_hand':
      return 'No Hand'
    case 'hand_detected':
      return 'Hand Detected'
    case 'error':
      return 'Camera Error'
    default:
      return 'Camera Off'
  }
}

export function gestureAvailabilityLabel(
  status: CameraStatus,
  gestureEnabled: boolean,
  errorMessage: string | null,
): string {
  if (!gestureEnabled) return 'Gesture: OFF'
  if (status === 'error') return 'Gesture: Unavailable'
  if (status === 'starting') return 'Gesture: Starting'
  if (status === 'hand_detected') return 'Gesture: Ready'
  if (status === 'ready' || status === 'no_hand') return 'Gesture: ON'
  return 'Gesture: OFF'
}
