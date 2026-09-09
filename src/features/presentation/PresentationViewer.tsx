import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraStatusBar } from '../gesture/CameraStatusBar'
import type { GestureRuntimeSnapshot } from '../gesture/cameraStatus'
import { GestureController } from '../gesture/GestureController'
import { GestureDebugOverlay } from '../gesture/GestureDebugOverlay'
import { GestureSettingsPanel } from '../gesture/GestureSettingsPanel'
import { useGestureSettings } from '../gesture/useGestureSettings'
import { handlePresentationIntent } from '../intent/applyPresentationIntent'
import {
  createNextSlideIntent,
  createPreviousSlideIntent,
  createToggleBlackScreenIntent,
  createTogglePointerIntent,
  type PresentationIntent,
} from '../intent/presentationIntent'
import { useInteractionState } from '../interaction/useInteractionState'
import { mapKeyboardToCommand } from '../input/mapKeyboardToCommand'
import { BlackScreenOverlay } from './BlackScreenOverlay'
import { SlidePointer } from './SlidePointer'
import { SlideViewer } from './SlideViewer'
import type { SlideCacheDebug } from './useSlidePageCache'
import { usePdfDocument } from './usePdfDocument'
import { usePresentationController } from './usePresentationController'

type Props = {
  pdfUrl: string
  onExit: () => void
}

const INITIAL_RUNTIME: GestureRuntimeSnapshot = {
  cameraStatus: 'off',
  gestureEnabled: true,
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
  vSignDetected: false,
  vSignHoldElapsedMs: null,
  interactionCooldownRemainingMs: 0,
}

export function PresentationViewer({ pdfUrl, onExit }: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const { pdfDocument, pageCount, error } = usePdfDocument(pdfUrl)
  const { interactionState, isPointerMode, setPointerMode } = useInteractionState()
  const {
    page,
    setPageCount,
    setViewport,
    dispatch,
    hidePointer,
    mode,
    zoomScale,
    panX,
    panY,
    pointerX,
    pointerY,
    pointerVisible,
    isBlackScreen,
  } = usePresentationController({
    onExit,
    onEnterZoom: useCallback(() => setPointerMode(false), [setPointerMode]),
  })
  const {
    gestureEnabled,
    swipeSensitivity,
    cooldown,
    debugMode,
    gestureConfig,
    setGestureEnabled,
    setSwipeSensitivity,
    setCooldown,
    setDebugMode,
    toggleDebugMode,
  } = useGestureSettings()
  const [runtime, setRuntime] = useState<GestureRuntimeSnapshot>(INITIAL_RUNTIME)
  const [slideCacheDebug, setSlideCacheDebug] = useState<SlideCacheDebug | null>(null)

  const intentContext = { interactionState, mode, isBlackScreen }
  const intentActions = { setPointerMode, hidePointer, dispatch }

  const emitPresentationIntent = useCallback(
    (intent: PresentationIntent) => {
      handlePresentationIntent(intent, intentContext, intentActions)
    },
    [dispatch, hidePointer, interactionState, isBlackScreen, mode, setPointerMode],
  )

  useEffect(() => {
    setPageCount(pageCount)
  }, [pageCount, setPageCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        toggleDebugMode()
        return
      }
      if (event.key.toLowerCase() === 'p' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        emitPresentationIntent(createTogglePointerIntent())
        return
      }
      if (event.key.toLowerCase() === 'b' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        emitPresentationIntent(createToggleBlackScreenIntent())
        return
      }
      const command = mapKeyboardToCommand(event, { mode, isBlackScreen })
      if (!command) return
      event.preventDefault()
      if (command === 'NEXT_SLIDE') {
        emitPresentationIntent(createNextSlideIntent())
        return
      }
      if (command === 'PREVIOUS_SLIDE') {
        emitPresentationIntent(createPreviousSlideIntent())
        return
      }
      dispatch(command)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, emitPresentationIntent, isBlackScreen, mode, toggleDebugMode])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const request = root.requestFullscreen?.() ?? document.documentElement.requestFullscreen?.()
    void Promise.resolve(request).catch(() => {})

    return () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  const handleSlideLayout = useCallback((slideWidth: number, slideHeight: number) => {
    const root = rootRef.current
    setViewport({
      containerWidth: root?.clientWidth ?? 0,
      containerHeight: root?.clientHeight ?? 0,
      slideWidth,
      slideHeight,
    })
  }, [setViewport])

  const handleStatusChange = useCallback((snapshot: GestureRuntimeSnapshot) => {
    setRuntime(snapshot)
  }, [])

  const handleCacheDebug = useCallback((debug: SlideCacheDebug) => {
    setSlideCacheDebug(debug)
  }, [])

  const cameraError = runtime.errorMessage

  return (
    <main ref={rootRef} className="presentation">
      {error ? <p className="error">{error}</p> : null}
      {pdfDocument ? (
        <SlideViewer
          pdfDocument={pdfDocument}
          page={page}
          pageCount={pageCount}
          zoomScale={zoomScale}
          panX={panX}
          panY={panY}
          onLayout={handleSlideLayout}
          onCacheDebug={debugMode ? handleCacheDebug : undefined}
          pointer={
            !isBlackScreen &&
            mode === 'PRESENTATION' &&
            isPointerMode &&
            pointerVisible ? (
              <SlidePointer x={pointerX} y={pointerY} />
            ) : null
          }
        />
      ) : null}

      <div className="presentation-chrome">
        <CameraStatusBar
          cameraStatus={gestureEnabled ? runtime.cameraStatus : 'off'}
          gestureEnabled={gestureEnabled}
          errorMessage={cameraError}
          onToggleGesture={() => setGestureEnabled(!gestureEnabled)}
        />
        <GestureSettingsPanel
          swipeSensitivity={swipeSensitivity}
          cooldown={cooldown}
          debugMode={debugMode}
          pointerModeEnabled={isPointerMode}
          onSensitivityChange={setSwipeSensitivity}
          onCooldownChange={setCooldown}
          onDebugModeChange={setDebugMode}
          onPointerModeChange={(enabled) => {
            if (enabled !== isPointerMode) {
              emitPresentationIntent(createTogglePointerIntent())
            }
          }}
        />
        <button
          type="button"
          className="black-screen-toggle"
          onClick={() => emitPresentationIntent(createToggleBlackScreenIntent())}
        >
          {isBlackScreen ? 'Black Screen OFF (B)' : 'Black Screen (B)'}
        </button>
      </div>

      {debugMode && !isBlackScreen ? (
        <GestureDebugOverlay
          snapshot={runtime}
          presentationMode={mode}
          pointerModeEnabled={isPointerMode}
          slideCacheDebug={slideCacheDebug}
          isBlackScreen={isBlackScreen}
          interactionState={interactionState}
        />
      ) : null}

      <GestureController
        enabled={gestureEnabled}
        gesturesActive={!isBlackScreen}
        gestureConfig={gestureConfig}
        interactionState={interactionState}
        onPresentationIntent={emitPresentationIntent}
        onCommand={dispatch}
        showDebugOverlay={debugMode}
        presentationMode={mode}
        onRuntimeError={(message) => {
          setRuntime((current) => ({
            ...current,
            errorMessage: message,
            cameraStatus: message ? 'error' : current.cameraStatus,
          }))
        }}
        onStatusChange={handleStatusChange}
      />

      <div className={`hud${isBlackScreen ? ' hud--hidden' : ''}`}>
        <span>
          {page} / {pageCount}
          {mode === 'ZOOM' ? ' · ZOOM（スワイプ無効・グーで解除）' : ''}
          {mode === 'PRESENTATION' && isPointerMode ? ' · Laser Pointer ON' : ''}
        </span>
        {cameraError ? <span className="hud-error">{cameraError}</span> : null}
      </div>

      <BlackScreenOverlay active={isBlackScreen} />
    </main>
  )
}
