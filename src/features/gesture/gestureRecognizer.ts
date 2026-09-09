import {
  commandLabel,
  type MovePointerCommand,
  type PresentationCommand,
  type PresentationMode,
} from '../presentation/commands'
import type { GestureConfig } from './gestureConfig'
import { DEFAULT_GESTURE_CONFIG } from './gestureConfig'
import {
  INDEX_FINGER_TIP_INDEX,
  MIRROR_LANDMARK_X,
  WRIST_LANDMARK_INDEX,
} from './handLandmarkerConfig'
import { emaPoint } from './smoothing'
import type { InteractionState } from '../interaction/interactionState'
import { isPointerInteraction } from '../interaction/interactionState'

export type GesturePhase =
  | 'idle'
  | 'tracking'
  | 'swipe_candidate'
  | 'gesture_hold'
  | 'cooldown'
  | 'pan'

export type LandmarkPoint = {
  x: number
  y: number
  z?: number
}

type Sample = {
  x: number
  y: number
  t: number
}

export type GestureDebugSnapshot = {
  phase: GesturePhase
  handDetected: boolean
  lastCommand: string | null
  panActive: boolean
  heldGesture: 'ok' | 'fist' | 'v' | null
  swipeDx: number
  swipeSamples: number
  cooldownRemainingMs: number
  handX: number | null
  handY: number | null
  pointerX: number | null
  pointerY: number | null
  pointerVisible: boolean
  vSignDetected: boolean
  vSignHoldElapsedMs: number | null
  interactionCooldownRemainingMs: number
}

export type InteractionGestureResult = 'toggle_pointer' | null

const INDEX = { tip: 8, mcp: 5 }
const MIDDLE = { tip: 12, mcp: 9 }
const RING = { tip: 16, mcp: 13 }
const PINKY = { tip: 20, mcp: 17 }
const THUMB_TIP = 4

export class GestureRecognizer {
  private config: GestureConfig
  private phase: GesturePhase = 'idle'
  private samples: Sample[] = []
  private cooldownUntil = 0
  private lastCommand: PresentationCommand | null = null
  private panActive = false
  private heldGesture: 'ok' | 'fist' | 'v' | null = null
  private prevMode: PresentationMode = 'PRESENTATION'
  private lastSwipeDx = 0
  private lastHandX: number | null = null
  private lastHandY: number | null = null

  private okHoldStart: number | null = null
  private okLatched = false
  private okStableFrames = 0
  private fistHoldStart: number | null = null
  private fistLatched = false
  private fistStableFrames = 0
  private vSignHoldStart: number | null = null
  private vSignLatched = false
  private vSignStableFrames = 0
  private interactionCooldownUntil = 0
  private vSignDetected = false
  private vSignHoldElapsedMs: number | null = null

  private prevWrist: { x: number; y: number } | null = null
  private panHistory: { dx: number; dy: number }[] = []
  private panEma = { dx: 0, dy: 0 }
  private pointerEma: { x: number; y: number } | null = null
  private pointerSentVisible = false
  private lastPointerX: number | null = null
  private lastPointerY: number | null = null
  private pointerLastSent: { x: number; y: number } | null = null

  constructor(config: GestureConfig = DEFAULT_GESTURE_CONFIG) {
    this.config = config
  }

  setConfig(config: GestureConfig) {
    this.config = config
  }

  observe(
    landmarks: LandmarkPoint[] | null | undefined,
    now: number,
    mode: PresentationMode,
    interactionState: InteractionState = 'NORMAL',
  ): PresentationCommand | null {
    if (this.prevMode !== mode) {
      this.resetMotionState()
      this.prevMode = mode
    }

    if (isPointerInteraction(interactionState) && mode === 'PRESENTATION') {
      this.samples = []
      this.lastSwipeDx = 0
      this.heldGesture = null
      this.resetPoseHoldState()
      this.prevWrist = null
      this.panHistory = []
      this.panEma = { dx: 0, dy: 0 }
      this.panActive = false
      this.phase = 'idle'
      return null
    }

    const inDiscreteCooldown = now < this.cooldownUntil
    const wrist = landmarks?.[WRIST_LANDMARK_INDEX]

    if (!wrist || !landmarks) {
      this.resetHandTracking()
      this.phase = inDiscreteCooldown ? 'cooldown' : 'idle'
      this.panActive = false
      this.lastHandX = null
      this.lastHandY = null
      return null
    }

    const mirroredX = MIRROR_LANDMARK_X ? 1 - wrist.x : wrist.x
    const mirroredY = wrist.y
    this.lastHandX = mirroredX
    this.lastHandY = mirroredY

    if (inDiscreteCooldown) {
      this.phase = 'cooldown'
      this.updatePoseLatches(landmarks)
      if (mode === 'ZOOM' && !isFist(landmarks, this.config)) {
        return this.observePan(mirroredX, mirroredY)
      }
      this.prevWrist = { x: mirroredX, y: mirroredY }
      this.panActive = false
      return null
    }

    if (this.phase === 'cooldown') {
      this.phase = 'idle'
      this.samples = []
      this.lastSwipeDx = 0
    }

    // Zoom mode: Fist → Pan (swipe disabled)
    if (mode === 'ZOOM') {
      if (isFist(landmarks, this.config)) {
        return this.observeFist(mirroredX, mirroredY, now, mode)
      }
      this.fistHoldStart = null
      this.fistLatched = false
      this.fistStableFrames = 0
      return this.observePan(mirroredX, mirroredY)
    }

    // Normal mode: active swipe motion blocks pose gestures
    this.recordSwipeSample(mirroredX, mirroredY, now)
    if (this.isSwipeMotionActive()) {
      this.heldGesture = null
      this.resetPoseHoldState()
      this.prevWrist = { x: mirroredX, y: mirroredY }
      this.panHistory = []
      this.panEma = { dx: 0, dy: 0 }
      this.panActive = false
      return this.evaluateSwipe(now)
    }

    if (isFist(landmarks, this.config)) {
      return this.observeFist(mirroredX, mirroredY, now, mode)
    }
    this.fistHoldStart = null
    this.fistLatched = false
    this.fistStableFrames = 0

    if (isOkSign(landmarks, this.config)) {
      return this.observeOk(mirroredX, mirroredY, now)
    }
    this.resetOkHoldState()

    this.prevWrist = { x: mirroredX, y: mirroredY }
    this.panHistory = []
    this.panEma = { dx: 0, dy: 0 }
    this.panActive = false
    return this.evaluateSwipe(now)
  }

  getDebug(handDetected: boolean, now = performance.now()): GestureDebugSnapshot {
    return {
      phase: this.phase,
      handDetected,
      lastCommand: this.lastCommand ? commandLabel(this.lastCommand) : null,
      panActive: this.panActive,
      heldGesture: this.heldGesture,
      swipeDx: this.lastSwipeDx,
      swipeSamples: this.samples.length,
      cooldownRemainingMs: Math.max(0, this.cooldownUntil - now),
      handX: this.lastHandX,
      handY: this.lastHandY,
      pointerX: this.lastPointerX,
      pointerY: this.lastPointerY,
      pointerVisible: this.pointerSentVisible,
      vSignDetected: this.vSignDetected,
      vSignHoldElapsedMs: this.vSignHoldElapsedMs,
      interactionCooldownRemainingMs: Math.max(0, this.interactionCooldownUntil - now),
    }
  }

  /**
   * Interaction gestures (e.g. V sign toggle). Independent from navigation observe().
   * Active only in PRESENTATION presentation mode.
   */
  observeInteractionGesture(
    landmarks: LandmarkPoint[] | null | undefined,
    now: number,
    mode: PresentationMode,
  ): InteractionGestureResult {
    this.vSignDetected = false
    this.vSignHoldElapsedMs = null

    if (mode !== 'PRESENTATION') {
      this.resetVSignHoldState()
      return null
    }

    if (now < this.interactionCooldownUntil) {
      if (landmarks && isVSign(landmarks, this.config)) {
        this.vSignDetected = true
      } else {
        this.resetVSignHoldState()
      }
      return null
    }

    if (!landmarks) {
      this.resetVSignHoldState()
      return null
    }

    if (!isVSign(landmarks, this.config)) {
      this.resetVSignHoldState()
      return null
    }

    this.vSignDetected = true
    this.heldGesture = 'v'
    this.vSignStableFrames += 1
    if (this.vSignStableFrames < this.config.vSign.stableFrames) {
      return null
    }

    if (this.vSignLatched) {
      return null
    }

    if (this.vSignHoldStart == null) this.vSignHoldStart = now
    this.vSignHoldElapsedMs = now - this.vSignHoldStart
    if (this.vSignHoldElapsedMs >= this.config.vSign.holdMs) {
      this.vSignLatched = true
      this.vSignHoldStart = null
      this.vSignHoldElapsedMs = null
      this.interactionCooldownUntil = now + this.config.discreteCooldownMs
      return 'toggle_pointer'
    }
    return null
  }

  observePointer(
    landmarks: LandmarkPoint[] | null | undefined,
    mode: PresentationMode,
    interactionState: InteractionState,
  ): MovePointerCommand | null {
    if (!isPointerInteraction(interactionState) || mode !== 'PRESENTATION') {
      return this.hidePointerCommand()
    }

    const tip = landmarks?.[INDEX_FINGER_TIP_INDEX]
    if (!tip) {
      return this.hidePointerCommand()
    }

    const rawX = Math.min(1, Math.max(0, MIRROR_LANDMARK_X ? 1 - tip.x : tip.x))
    const rawY = Math.min(1, Math.max(0, tip.y))
    this.pointerEma = emaPoint(this.pointerEma, { x: rawX, y: rawY }, this.config.pointer.emaAlpha)

    const { minMove } = this.config.pointer
    if (
      this.pointerLastSent &&
      Math.abs(this.pointerEma.x - this.pointerLastSent.x) < minMove &&
      Math.abs(this.pointerEma.y - this.pointerLastSent.y) < minMove &&
      this.pointerSentVisible
    ) {
      this.lastPointerX = this.pointerEma.x
      this.lastPointerY = this.pointerEma.y
      return null
    }

    this.pointerLastSent = { x: this.pointerEma.x, y: this.pointerEma.y }
    this.lastPointerX = this.pointerEma.x
    this.lastPointerY = this.pointerEma.y
    this.pointerSentVisible = true

    const command: MovePointerCommand = {
      type: 'MOVE_POINTER',
      x: this.pointerEma.x,
      y: this.pointerEma.y,
      visible: true,
    }
    this.lastCommand = command
    return command
  }

  private hidePointerCommand(): MovePointerCommand | null {
    if (!this.pointerSentVisible) return null
    this.pointerSentVisible = false
    this.pointerEma = null
    this.pointerLastSent = null
    this.lastPointerX = null
    this.lastPointerY = null
    const command: MovePointerCommand = {
      type: 'MOVE_POINTER',
      x: 0,
      y: 0,
      visible: false,
    }
    this.lastCommand = command
    return command
  }

  private observeOk(x: number, y: number, now: number): PresentationCommand | null {
    this.heldGesture = 'ok'
    this.samples = []
    this.lastSwipeDx = 0
    this.prevWrist = { x, y }
    this.panHistory = []
    this.panEma = { dx: 0, dy: 0 }
    this.panActive = false

    this.okStableFrames += 1
    if (this.okStableFrames < this.config.ok.stableFrames) {
      this.phase = 'tracking'
      return null
    }

    if (this.okLatched) {
      this.phase = 'gesture_hold'
      return null
    }

    if (this.okHoldStart == null) this.okHoldStart = now
    this.phase = 'gesture_hold'
    if (now - this.okHoldStart >= this.config.ok.holdMs) {
      this.okLatched = true
      this.okHoldStart = null
      return this.emitDiscrete('ENTER_ZOOM', now)
    }
    return null
  }

  private observeFist(
    x: number,
    y: number,
    now: number,
    mode: PresentationMode,
  ): PresentationCommand | null {
    this.heldGesture = 'fist'
    this.samples = []
    this.lastSwipeDx = 0
    this.prevWrist = { x, y }
    this.panHistory = []
    this.panEma = { dx: 0, dy: 0 }
    this.panActive = false
    this.resetOkHoldState()

    this.fistStableFrames += 1
    if (this.fistStableFrames < this.config.fist.stableFrames) {
      this.phase = 'tracking'
      return null
    }

    if (this.fistLatched) {
      this.phase = 'gesture_hold'
      return null
    }

    if (this.fistHoldStart == null) this.fistHoldStart = now
    this.phase = 'gesture_hold'
    if (now - this.fistHoldStart >= this.config.fist.holdMs) {
      this.fistLatched = true
      this.fistHoldStart = null
      if (mode !== 'ZOOM') return null
      return this.emitDiscrete('EXIT_ZOOM', now)
    }
    return null
  }

  private emitDiscrete(command: Exclude<PresentationCommand, { type: 'PAN' }>, now: number): PresentationCommand {
    this.lastCommand = command
    this.cooldownUntil = now + this.config.discreteCooldownMs
    this.phase = 'cooldown'
    this.samples = []
    this.lastSwipeDx = 0
    this.panActive = false
    return command
  }

  private updatePoseLatches(hand: LandmarkPoint[]) {
    if (!isOkSign(hand, this.config)) this.resetOkHoldState()
    if (!isFist(hand, this.config)) {
      this.fistHoldStart = null
      this.fistLatched = false
      this.fistStableFrames = 0
    }
    this.heldGesture = isFist(hand, this.config) ? 'fist' : isOkSign(hand, this.config) ? 'ok' : null
  }

  private resetVSignHoldState() {
    this.vSignHoldStart = null
    this.vSignLatched = false
    this.vSignStableFrames = 0
    this.vSignHoldElapsedMs = null
    if (this.heldGesture === 'v') this.heldGesture = null
  }

  private resetOkHoldState() {
    this.okHoldStart = null
    this.okLatched = false
    this.okStableFrames = 0
  }

  private resetPoseHoldState() {
    this.resetOkHoldState()
    this.fistHoldStart = null
    this.fistLatched = false
    this.fistStableFrames = 0
  }

  private resetMotionState() {
    this.samples = []
    this.prevWrist = null
    this.panHistory = []
    this.panEma = { dx: 0, dy: 0 }
    this.panActive = false
    this.lastSwipeDx = 0
    this.pointerEma = null
    this.pointerSentVisible = false
    this.pointerLastSent = null
    this.lastPointerX = null
    this.lastPointerY = null
  }

  private resetHandTracking() {
    this.samples = []
    this.resetPoseHoldState()
    this.resetVSignHoldState()
    this.heldGesture = null
    this.prevWrist = null
    this.panHistory = []
    this.panEma = { dx: 0, dy: 0 }
    this.lastSwipeDx = 0
  }

  private recordSwipeSample(x: number, y: number, now: number) {
    this.samples.push({ x, y, t: now })
    this.samples = this.samples.filter((sample) => now - sample.t <= this.config.swipe.maxDurationMs)
  }

  private isSwipeMotionActive(): boolean {
    if (this.samples.length < 2) return false
    const metrics = this.getSwipeMetrics()
    return metrics.absDx >= this.config.swipe.motionLockDx && metrics.absDx > metrics.absDy
  }

  private getSwipeMetrics() {
    let minSample = this.samples[0]
    let maxSample = this.samples[0]
    for (const sample of this.samples) {
      if (sample.x < minSample.x) minSample = sample
      if (sample.x > maxSample.x) maxSample = sample
    }

    const absDx = maxSample.x - minSample.x
    const direction: 1 | -1 = minSample.t < maxSample.t ? 1 : -1
    const ys = this.samples.map((sample) => sample.y)
    const absDy = Math.max(...ys) - Math.min(...ys)
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    return { absDx, absDy, direction, first, last }
  }

  private evaluateSwipe(now: number): PresentationCommand | null {
    const { swipe } = this.config

    if (this.samples.length < swipe.minSamples) {
      this.phase = 'tracking'
      this.lastSwipeDx = this.samples.length >= 2 ? this.getSwipeMetrics().absDx : 0
      return null
    }

    const { absDx, absDy, direction, first, last } = this.getSwipeMetrics()
    this.lastSwipeDx = absDx

    const isCandidate =
      absDx >= swipe.minDx * 0.35 &&
      absDx > absDy

    this.phase = isCandidate ? 'swipe_candidate' : 'tracking'

    if (
      absDx >= swipe.minDx &&
      absDy <= absDx * swipe.maxDyRatio &&
      last.t - first.t <= swipe.maxDurationMs &&
      isMostlyMonotonic(this.samples, direction, swipe.minMonotonicRatio)
    ) {
      const command = direction > 0 ? 'NEXT_SLIDE' : 'PREVIOUS_SLIDE'
      return this.emitDiscrete(command, now)
    }

    return null
  }

  private observePan(x: number, y: number): PresentationCommand | null {
    const { pan } = this.config

    if (!this.prevWrist) {
      this.prevWrist = { x, y }
      this.phase = 'tracking'
      this.panActive = false
      return null
    }

    const rawDx = (x - this.prevWrist.x) * pan.sensitivityX
    const rawDy = (y - this.prevWrist.y) * pan.sensitivityY
    this.prevWrist = { x, y }

    this.panEma.dx = this.panEma.dx * (1 - pan.emaAlpha) + rawDx * pan.emaAlpha
    this.panEma.dy = this.panEma.dy * (1 - pan.emaAlpha) + rawDy * pan.emaAlpha

    this.panHistory.push({ dx: this.panEma.dx, dy: this.panEma.dy })
    if (this.panHistory.length > pan.smoothFrames) {
      this.panHistory.shift()
    }

    const count = this.panHistory.length
    const dx = this.panHistory.reduce((sum, sample) => sum + sample.dx, 0) / count
    const dy = this.panHistory.reduce((sum, sample) => sum + sample.dy, 0) / count

    if (Math.hypot(dx, dy) < pan.deadzonePx) {
      this.phase = 'tracking'
      this.panActive = false
      return null
    }

    this.phase = 'pan'
    this.panActive = true
    return { type: 'PAN', dx, dy }
  }
}

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function palmSize(hand: LandmarkPoint[], config: GestureConfig): number {
  return Math.max(distance(hand[WRIST_LANDMARK_INDEX], hand[MIDDLE.mcp]), 0.08)
}

function isFingerExtended(
  hand: LandmarkPoint[],
  finger: { tip: number; mcp: number },
  config: GestureConfig,
): boolean {
  const wrist = hand[WRIST_LANDMARK_INDEX]
  return distance(hand[finger.tip], wrist) > distance(hand[finger.mcp], wrist) * config.pose.fingerExtendRatio
}

function isFingerFolded(
  hand: LandmarkPoint[],
  finger: { tip: number; mcp: number },
  config: GestureConfig,
): boolean {
  return distance(hand[finger.tip], hand[finger.mcp]) < palmSize(hand, config) * config.fist.foldPalmRatio
}

function isVSign(hand: LandmarkPoint[], config: GestureConfig): boolean {
  if (hand.length < 21) return false
  return (
    isFingerExtended(hand, INDEX, config) &&
    isFingerExtended(hand, MIDDLE, config) &&
    isFingerFolded(hand, RING, config) &&
    isFingerFolded(hand, PINKY, config)
  )
}

function isOkSign(hand: LandmarkPoint[], config: GestureConfig): boolean {
  if (hand.length < 21) return false
  const pinch = distance(hand[THUMB_TIP], hand[INDEX.tip]) < config.ok.thumbIndexMaxDistance
  const indexCurled = !isFingerExtended(hand, INDEX, config)
  return (
    pinch &&
    indexCurled &&
    isFingerExtended(hand, MIDDLE, config) &&
    isFingerExtended(hand, RING, config) &&
    isFingerExtended(hand, PINKY, config)
  )
}

function isFist(hand: LandmarkPoint[], config: GestureConfig): boolean {
  if (hand.length < 21) return false
  return (
    isFingerFolded(hand, MIDDLE, config) &&
    isFingerFolded(hand, RING, config) &&
    isFingerFolded(hand, PINKY, config)
  )
}

function isMostlyMonotonic(samples: Sample[], direction: 1 | -1, minRatio: number): boolean {
  let aligned = 0
  let counted = 0
  for (let i = 1; i < samples.length; i += 1) {
    const step = samples[i].x - samples[i - 1].x
    if (Math.abs(step) < 0.0015) continue
    counted += 1
    if (Math.sign(step) === direction) aligned += 1
  }
  if (counted === 0) return false
  return counted >= 1 && aligned / counted >= minRatio
}
