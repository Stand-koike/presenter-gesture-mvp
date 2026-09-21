import {
  INDEX_FINGER_TIP_INDEX,
  MIRROR_LANDMARK_X,
} from '../gesture/handLandmarkerConfig'

export type NormalizedPoint = {
  x: number
  y: number
}

/** MediaPipe 正規化座標（0–1）を画面操作向けに変換（人差し指先）。 */
export function indexFingerFromLandmarks(
  landmarks: { x: number; y: number }[] | null | undefined,
): NormalizedPoint | null {
  const tip = landmarks?.[INDEX_FINGER_TIP_INDEX]
  if (!tip) return null
  const x = Math.min(1, Math.max(0, MIRROR_LANDMARK_X ? 1 - tip.x : tip.x))
  const y = Math.min(1, Math.max(0, tip.y))
  return { x, y }
}
