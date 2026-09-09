import { useCallback, useRef, useState } from 'react'
import { clampPan, type SlideViewport } from './clampPan'
import {
  isMovePointerCommand,
  isPanCommand,
  type PresentationCommand,
  type PresentationMode,
} from './commands'
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from './zoomConstants'

type Options = {
  onExit: () => void
  /** Called when zoom mode is entered (Keyboard Z / OK sign). Clears InteractionState pointer mode. */
  onEnterZoom?: () => void
}

const POINTER_EPSILON = 0.002

/**
 * Presentation Controller.
 * All slide navigation, zoom/pan, pointer, and black screen go through dispatch().
 */
export function usePresentationController({ onExit, onEnterZoom }: Options) {
  const [page, setPage] = useState(1)
  const [pageCount, setPageCountState] = useState(0)
  const [mode, setMode] = useState<PresentationMode>('PRESENTATION')
  const [zoomScale, setZoomScale] = useState(MIN_ZOOM)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [pointerX, setPointerX] = useState(0.5)
  const [pointerY, setPointerY] = useState(0.5)
  const [pointerVisible, setPointerVisible] = useState(false)
  const [isBlackScreen, setIsBlackScreen] = useState(false)

  const pageCountRef = useRef(0)
  const modeRef = useRef<PresentationMode>('PRESENTATION')
  const zoomRef = useRef(MIN_ZOOM)
  const panRef = useRef({ x: 0, y: 0 })
  const pointerRef = useRef({ x: 0.5, y: 0.5 })
  const pointerVisibleRef = useRef(false)
  const pointerVisibleBeforeBlackRef = useRef(false)
  const isBlackScreenRef = useRef(false)
  const viewportRef = useRef<SlideViewport | null>(null)
  const onEnterZoomRef = useRef(onEnterZoom)
  onEnterZoomRef.current = onEnterZoom

  const hidePointer = useCallback(() => {
    if (!pointerVisibleRef.current) return
    pointerVisibleRef.current = false
    setPointerVisible(false)
  }, [])

  const exitBlackScreen = useCallback(() => {
    if (!isBlackScreenRef.current) return
    isBlackScreenRef.current = false
    setIsBlackScreen(false)
    if (pointerVisibleBeforeBlackRef.current && modeRef.current === 'PRESENTATION') {
      pointerVisibleRef.current = true
      setPointerVisible(true)
    }
  }, [])

  const enterBlackScreen = useCallback(() => {
    if (isBlackScreenRef.current) return
    pointerVisibleBeforeBlackRef.current = pointerVisibleRef.current
    hidePointer()
    isBlackScreenRef.current = true
    setIsBlackScreen(true)
  }, [hidePointer])

  const setPageCount = useCallback((count: number) => {
    pageCountRef.current = count
    setPageCountState(count)
    setPage((current) => {
      if (count <= 0) return 1
      return Math.min(Math.max(current, 1), count)
    })
  }, [])

  const setViewport = useCallback((viewport: SlideViewport) => {
    viewportRef.current = viewport
    if (modeRef.current !== 'ZOOM') return
    const clamped = clampPan(panRef.current.x, panRef.current.y, zoomRef.current, viewport)
    if (clamped.x === panRef.current.x && clamped.y === panRef.current.y) return
    panRef.current = clamped
    setPanX(clamped.x)
    setPanY(clamped.y)
  }, [])

  const resetZoomState = useCallback(() => {
    modeRef.current = 'PRESENTATION'
    zoomRef.current = MIN_ZOOM
    panRef.current = { x: 0, y: 0 }
    setMode('PRESENTATION')
    setZoomScale(MIN_ZOOM)
    setPanX(0)
    setPanY(0)
  }, [])

  const dispatch = useCallback((command: PresentationCommand) => {
    if (isMovePointerCommand(command)) {
      if (isBlackScreenRef.current || modeRef.current !== 'PRESENTATION') return
      if (!command.visible) {
        hidePointer()
        return
      }
      const dx = Math.abs(command.x - pointerRef.current.x)
      const dy = Math.abs(command.y - pointerRef.current.y)
      const moved = dx >= POINTER_EPSILON || dy >= POINTER_EPSILON
      if (!moved && pointerVisibleRef.current) return
      pointerRef.current = { x: command.x, y: command.y }
      pointerVisibleRef.current = true
      setPointerX(command.x)
      setPointerY(command.y)
      setPointerVisible(true)
      return
    }

    if (isPanCommand(command)) {
      if (isBlackScreenRef.current || modeRef.current !== 'ZOOM') return
      const next = clampPan(
        panRef.current.x + command.dx,
        panRef.current.y + command.dy,
        zoomRef.current,
        viewportRef.current,
      )
      if (next.x === panRef.current.x && next.y === panRef.current.y) return
      panRef.current = next
      setPanX(next.x)
      setPanY(next.y)
      return
    }

    switch (command) {
      case 'NEXT_SLIDE':
        if (modeRef.current === 'ZOOM') resetZoomState()
        setPage((current) => {
          const total = pageCountRef.current
          if (total <= 0) return current
          return Math.min(total, current + 1)
        })
        break
      case 'PREVIOUS_SLIDE':
        if (modeRef.current === 'ZOOM') resetZoomState()
        setPage((current) => Math.max(1, current - 1))
        break
      case 'ENTER_ZOOM': {
        if (isBlackScreenRef.current) return
        hidePointer()
        onEnterZoomRef.current?.()
        const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, DEFAULT_ZOOM))
        modeRef.current = 'ZOOM'
        zoomRef.current = scale
        setMode('ZOOM')
        setZoomScale(scale)
        break
      }
      case 'EXIT_ZOOM':
        resetZoomState()
        break
      case 'TOGGLE_BLACK_SCREEN':
        if (isBlackScreenRef.current) exitBlackScreen()
        else enterBlackScreen()
        break
      case 'EXIT_PRESENTATION':
        onExit()
        break
    }
  }, [enterBlackScreen, exitBlackScreen, hidePointer, onExit, resetZoomState])

  return {
    page,
    pageCount,
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
  }
}
