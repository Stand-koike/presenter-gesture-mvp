export type SensitivityLevel = 'low' | 'medium' | 'high'
export type CooldownLevel = 'short' | 'medium' | 'long'

export type GestureConfig = {
  swipe: {
    minDx: number
    maxDurationMs: number
    maxDyRatio: number
    minSamples: number
    minMonotonicRatio: number
    motionLockDx: number
  }
  ok: {
    thumbIndexMaxDistance: number
    holdMs: number
    stableFrames: number
  }
  fist: {
    holdMs: number
    foldPalmRatio: number
    stableFrames: number
  }
  vSign: {
    holdMs: number
    stableFrames: number
  }
  pan: {
    sensitivityX: number
    sensitivityY: number
    smoothFrames: number
    deadzonePx: number
    emaAlpha: number
  }
  pointer: {
    emaAlpha: number
    minMove: number
  }
  pose: {
    fingerExtendRatio: number
  }
  discreteCooldownMs: number
}

/** Base values aligned with the current Phase 3 implementation. */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  swipe: {
    minDx: 0.12,
    maxDurationMs: 700,
    maxDyRatio: 0.65,
    minSamples: 3,
    minMonotonicRatio: 0.55,
    motionLockDx: 0.05,
  },
  ok: {
    thumbIndexMaxDistance: 0.07,
    holdMs: 500,
    stableFrames: 3,
  },
  fist: {
    holdMs: 400,
    foldPalmRatio: 0.55,
    stableFrames: 3,
  },
  vSign: {
    holdMs: 400,
    stableFrames: 3,
  },
  pan: {
    sensitivityX: 1400,
    sensitivityY: 900,
    smoothFrames: 5,
    deadzonePx: 0.8,
    emaAlpha: 0.22,
  },
  pointer: {
    emaAlpha: 0.38,
    minMove: 0.002,
  },
  pose: {
    fingerExtendRatio: 1.2,
  },
  discreteCooldownMs: 800,
}

const SWIPE_SENSITIVITY_SCALE: Record<SensitivityLevel, number> = {
  low: 1.35,
  medium: 1,
  high: 0.72,
}

const COOLDOWN_MS: Record<CooldownLevel, number> = {
  short: 500,
  medium: 800,
  long: 1200,
}

export function resolveGestureConfig(
  sensitivity: SensitivityLevel,
  cooldown: CooldownLevel,
): GestureConfig {
  const base = DEFAULT_GESTURE_CONFIG
  const scale = SWIPE_SENSITIVITY_SCALE[sensitivity]
  return {
    ...base,
    swipe: {
      ...base.swipe,
      minDx: base.swipe.minDx * scale,
      motionLockDx: base.swipe.motionLockDx * scale,
    },
    discreteCooldownMs: COOLDOWN_MS[cooldown],
  }
}

export const SENSITIVITY_LABELS: Record<SensitivityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const COOLDOWN_LABELS: Record<CooldownLevel, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
}
