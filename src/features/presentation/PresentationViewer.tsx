import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraStatusBar } from '../gesture/CameraStatusBar'
import type { GestureRuntimeSnapshot } from '../gesture/cameraStatus'
import { GestureController } from '../gesture/GestureController'
import { GestureDebugOverlay } from '../gesture/GestureDebugOverlay'
import { GestureSettingsPanel } from '../gesture/GestureSettingsPanel'
import { useGestureSettings } from '../gesture/useGestureSettings'
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
}

export function PresentationViewer({ pdfUrl, onExit }: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const { pdfDocument, pageCount, error } = usePdfDocument(pdfUrl)
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
  } = usePresentationController({ onExit })
  const {
    gestureEnabled,
    swipeSensitivity,
    cooldown,
    debugMode,
    pointerModeEnabled,
    gestureConfig,
    setGestureEnabled,
    setSwipeSensitivity,
    setCooldown,
    setDebugMode,
    setPointerModeEnabled,
    toggleDebugMode,
  } = useGestureSettings()
  const [runtime, setRuntime] = useState<GestureRuntimeSnapshot>(INITIAL_RUNTIME)
  const [slideCacheDebug, setSlideCacheDebug] = useState<SlideCacheDebug | null>(null)

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
        if (pointerModeEnabled) {
          setPointerModeEnabled(false)
          hidePointer()
        } else {
          setPointerModeEnabled(true)
        }
        return
      }
      const command = mapKeyboardToCommand(event, { mode, isBlackScreen })
      if (!command) return
      event.preventDefault()
      dispatch(command)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, hidePointer, isBlackScreen, mode, pointerModeEnabled, setPointerModeEnabled, toggleDebugMode])

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
            pointerModeEnabled &&
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
          pointerModeEnabled={pointerModeEnabled}
          onSensitivityChange={setSwipeSensitivity}
          onCooldownChange={setCooldown}
          onDebugModeChange={setDebugMode}
          onPointerModeChange={(enabled) => {
            setPointerModeEnabled(enabled)
            if (!enabled) hidePointer()
          }}
        />
        <button
          type="button"
          className="black-screen-toggle"
          onClick={() => dispatch('TOGGLE_BLACK_SCREEN')}
        >
          {isBlackScreen ? 'Black Screen OFF (B)' : 'Black Screen (B)'}
        </button>
      </div>

      {debugMode && !isBlackScreen ? (
        <GestureDebugOverlay
          snapshot={runtime}
          presentationMode={mode}
          pointerModeEnabled={pointerModeEnabled}
          slideCacheDebug={slideCacheDebug}
          isBlackScreen={isBlackScreen}
        />
      ) : null}

      <GestureController
        enabled={gestureEnabled}
        gesturesActive={!isBlackScreen}
        gestureConfig={gestureConfig}
        pointerModeEnabled={pointerModeEnabled}
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
          {mode === 'PRESENTATION' && pointerModeEnabled ? ' · Pointer ON' : ''}
        </span>
        {cameraError ? <span className="hud-error">{cameraError}</span> : null}
      </div>

      <BlackScreenOverlay active={isBlackScreen} />
    </main>
  )
}
