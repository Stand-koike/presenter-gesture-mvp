export const HAND_LANDMARKER_OPTIONS = {
  runningMode: 'VIDEO' as const,
  numHands: 1,
  minHandDetectionConfidence: 0.6,
  minHandPresenceConfidence: 0.6,
  minTrackingConfidence: 0.6,
}

export const HAND_LANDMARKER_MODEL_PATH = 'models/hand_landmarker.task'
export const MEDIAPIPE_WASM_PATH = 'mediapipe/wasm'

/** Landmark 0 (wrist) is the swipe tracking point. */
export const WRIST_LANDMARK_INDEX = 0

/** Landmark 8 (index finger tip) drives pointer position. */
export const INDEX_FINGER_TIP_INDEX = 8

/**
 * Webcam images are mirrored relative to the presenter.
 * Flip X so a physical right swipe becomes a positive dx.
 */
export const MIRROR_LANDMARK_X = true
