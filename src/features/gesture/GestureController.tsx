import { useEffect, useRef, useState } from 'react'
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { startCameraStream, toCameraFailure } from '../camera/startCamera'
import type { PresentationCommand, PresentationMode } from '../presentation/commands'
import {
  type GestureRuntimeSnapshot,
} from './cameraStatus'
import { assertHandLandmarkerModelExists, createHandLandmarker } from './createHandLandmarker'
import { GestureDebugPanel } from './GestureDebugPanel'
import type { GestureConfig } from './gestureConfig'
import { GestureRecognizer } from './gestureRecognizer'

type Props = {
  enabled?: boolean
  gesturesActive?: boolean
  gestureConfig: GestureConfig
  pointerModeEnabled?: boolean
  onCommand?: (command: PresentationCommand) => void
  showHomeDebug?: boolean
  showDebugOverlay?: boolean
  presentationMode?: PresentationMode
  onRuntimeError?: (message: string | null) => void
  onStatusChange?: (snapshot: GestureRuntimeSnapshot) => void
}

const EMPTY_SNAPSHOT: GestureRuntimeSnapshot = {
  cameraStatus: 'off',
  gestureEnabled: false,
  errorMessage: null,
  handDetected: false,
  inferenceFps: 0,
  cooldownRemainingMs: 0,
  handX: null,
  handY: null,
  phase: 'idle',
  heldGesture: null,
  lastCommand: null,
  swipeDx: 0,
  swipeSamples: 0,
  panActive: false,
  landmarks: null,
  pointerX: null,
  pointerY: null,
  pointerVisible: false,
}

export function GestureController({
  enabled = true,
  gesturesActive = true,
  gestureConfig,
  pointerModeEnabled = false,
  onCommand,
  showHomeDebug = false,
  showDebugOverlay = false,
  presentationMode = 'PRESENTATION',
  onRuntimeError,
  onStatusChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCommandRef = useRef(onCommand)
  const onRuntimeErrorRef = useRef(onRuntimeError)
  const onStatusChangeRef = useRef(onStatusChange)
  const modeRef = useRef(presentationMode)
  const configRef = useRef(gestureConfig)
  const enabledRef = useRef(enabled)
  const gesturesActiveRef = useRef(gesturesActive)
  const pointerModeRef = useRef(pointerModeEnabled)
  const [homeDebug, setHomeDebug] = useState(EMPTY_SNAPSHOT)

  onCommandRef.current = onCommand
  onRuntimeErrorRef.current = onRuntimeError
  onStatusChangeRef.current = onStatusChange
  modeRef.current = presentationMode
  configRef.current = gestureConfig
  enabledRef.current = enabled
  gesturesActiveRef.current = gesturesActive
  pointerModeRef.current = pointerModeEnabled

  useEffect(() => {
    if (!enabled) {
      onRuntimeErrorRef.current?.(null)
      onStatusChangeRef.current?.({
        ...EMPTY_SNAPSHOT,
        cameraStatus: 'off',
        gestureEnabled: false,
      })
      return
    }

    let stopped = false
    let raf = 0
    let stream: MediaStream | null = null
    let landmarker: HandLandmarker | null = null
    let modelUrl: string | null = null
    const recognizer = new GestureRecognizer(configRef.current)
    let lastSnapshot = EMPTY_SNAPSHOT
    let frameCount = 0
    let fpsWindowStart = performance.now()
    let inferenceFps = 0

    const publish = (next: GestureRuntimeSnapshot) => {
      if (
        lastSnapshot.cameraStatus === next.cameraStatus &&
        lastSnapshot.gestureEnabled === next.gestureEnabled &&
        lastSnapshot.errorMessage === next.errorMessage &&
        lastSnapshot.handDetected === next.handDetected &&
        Math.abs(lastSnapshot.inferenceFps - next.inferenceFps) < 0.5 &&
        Math.ceil(lastSnapshot.cooldownRemainingMs / 100) === Math.ceil(next.cooldownRemainingMs / 100) &&
        lastSnapshot.phase === next.phase &&
        lastSnapshot.heldGesture === next.heldGesture &&
        lastSnapshot.lastCommand === next.lastCommand &&
        lastSnapshot.panActive === next.panActive &&
        Math.abs(lastSnapshot.swipeDx - next.swipeDx) < 0.01 &&
        lastSnapshot.swipeSamples === next.swipeSamples &&
        lastSnapshot.handX?.toFixed(3) === next.handX?.toFixed(3) &&
        lastSnapshot.handY?.toFixed(3) === next.handY?.toFixed(3) &&
        lastSnapshot.pointerX?.toFixed(3) === next.pointerX?.toFixed(3) &&
        lastSnapshot.pointerY?.toFixed(3) === next.pointerY?.toFixed(3) &&
        lastSnapshot.pointerVisible === next.pointerVisible &&
        lastSnapshot.landmarks === next.landmarks
      ) {
        return
      }
      lastSnapshot = next
      onStatusChangeRef.current?.(next)
      if (showHomeDebug) setHomeDebug(next)
    }

    const fail = (message: string) => {
      onRuntimeErrorRef.current?.(message)
      publish({
        ...EMPTY_SNAPSHOT,
        cameraStatus: 'error',
        gestureEnabled: true,
        errorMessage: message,
      })
    }

    const stopStream = () => {
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      if (videoRef.current) videoRef.current.srcObject = null
    }

    async function ensureLandmarker() {
      if (landmarker) return landmarker
      if (!modelUrl) {
        modelUrl = await assertHandLandmarkerModelExists()
      }
      landmarker = await createHandLandmarker(modelUrl)
      return landmarker
    }

    async function start() {
      const video = videoRef.current
      if (!video) return

      publish({
        ...EMPTY_SNAPSHOT,
        cameraStatus: 'starting',
        gestureEnabled: true,
      })

      try {
        stream = await startCameraStream()
        if (stopped) {
          stopStream()
          return
        }
        video.srcObject = stream
        video.muted = true
        await video.play()
      } catch (error) {
        fail(toCameraFailure(error).message)
        return
      }

      try {
        await ensureLandmarker()
      } catch (error) {
        stopStream()
        fail(error instanceof Error ? error.message : String(error))
        return
      }

      if (stopped) return
      onRuntimeErrorRef.current?.(null)

      const loop = (now: number) => {
        if (stopped || !enabledRef.current) return
        raf = requestAnimationFrame(loop)

        if (!landmarker || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return
        }

        recognizer.setConfig(configRef.current)

        try {
          const result = landmarker.detectForVideo(video, now)
          const hand = result.landmarks?.[0] ?? null
          if (gesturesActiveRef.current) {
            const command = recognizer.observe(hand, now, modeRef.current)
            if (command) onCommandRef.current?.(command)

            const pointerCommand = recognizer.observePointer(
              hand,
              modeRef.current,
              pointerModeRef.current,
            )
            if (pointerCommand) onCommandRef.current?.(pointerCommand)
          }

          frameCount += 1
          if (now - fpsWindowStart >= 1000) {
            inferenceFps = frameCount * 1000 / (now - fpsWindowStart)
            frameCount = 0
            fpsWindowStart = now
          }

          const debug = recognizer.getDebug(Boolean(hand), now)
          publish({
            cameraStatus: hand ? 'hand_detected' : 'no_hand',
            gestureEnabled: true,
            errorMessage: null,
            handDetected: debug.handDetected,
            inferenceFps,
            cooldownRemainingMs: debug.cooldownRemainingMs,
            handX: debug.handX,
            handY: debug.handY,
            phase: debug.phase,
            heldGesture: debug.heldGesture,
            lastCommand: debug.lastCommand,
            panActive: debug.panActive,
            swipeDx: debug.swipeDx,
            swipeSamples: debug.swipeSamples,
            landmarks: hand ? hand.map((p) => ({ x: p.x, y: p.y })) : null,
            pointerX: debug.pointerX,
            pointerY: debug.pointerY,
            pointerVisible: debug.pointerVisible,
          })
        } catch {
          const debug = recognizer.getDebug(false, now)
          publish({
            cameraStatus: 'no_hand',
            gestureEnabled: true,
            errorMessage: lastSnapshot.errorMessage,
            handDetected: false,
            inferenceFps,
            cooldownRemainingMs: debug.cooldownRemainingMs,
            handX: null,
            handY: null,
            phase: debug.phase,
            heldGesture: debug.heldGesture,
            lastCommand: debug.lastCommand,
            panActive: false,
            swipeDx: debug.swipeDx,
            swipeSamples: debug.swipeSamples,
            landmarks: null,
            pointerX: debug.pointerX,
            pointerY: debug.pointerY,
            pointerVisible: debug.pointerVisible,
          })
        }
      }

      publish({
        ...EMPTY_SNAPSHOT,
        cameraStatus: 'no_hand',
        gestureEnabled: true,
      })
      raf = requestAnimationFrame(loop)
    }

    void start()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stopStream()
      landmarker?.close()
      landmarker = null
    }
  }, [enabled, showHomeDebug])

  useEffect(() => {
    if (enabled) return
    if (videoRef.current) videoRef.current.srcObject = null
  }, [enabled])

  if (!enabled && !showHomeDebug) {
    return null
  }

  const video = (
    <video
      ref={videoRef}
      className={showHomeDebug ? 'camera-preview' : 'camera-video'}
      muted
      playsInline
      autoPlay
      aria-hidden={!showHomeDebug}
    />
  )

  if (showHomeDebug) {
    return (
      <>
        {video}
        <GestureDebugPanel snapshot={homeDebug} presentationMode={presentationMode} />
      </>
    )
  }

  if (showDebugOverlay) {
    return video
  }

  return video
}
