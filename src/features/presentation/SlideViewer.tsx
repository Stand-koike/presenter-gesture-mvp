import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { SlideCacheDebug } from './useSlidePageCache'
import { useSlidePageCache } from './useSlidePageCache'
import { useSlideTransition } from './useSlideTransition'

type Props = {
  pdfDocument: PDFDocumentProxy
  page: number
  pageCount: number
  zoomScale: number
  panX: number
  panY: number
  onLayout?: (width: number, height: number) => void
  onCacheDebug?: (debug: SlideCacheDebug) => void
  pointer?: ReactNode
}

export function SlideViewer({
  pdfDocument,
  page,
  pageCount,
  zoomScale,
  panX,
  panY,
  onLayout,
  onCacheDebug,
  pointer,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { revision, currentReady, debug, applyToCanvas } = useSlidePageCache(
    pdfDocument,
    page,
    pageCount,
  )

  const blit = useCallback(
    () => applyToCanvas(canvasRef.current, page),
    [applyToCanvas, page],
  )

  const { opacity, fadeMs } = useSlideTransition(page, currentReady, revision, blit)

  useEffect(() => {
    onCacheDebug?.(debug)
  }, [debug, onCacheDebug])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !onLayout || !currentReady) return

    const report = () => onLayout(stage.offsetWidth, stage.offsetHeight)
    report()
    const observer = new ResizeObserver(report)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [currentReady, onLayout, page, revision])

  return (
    <div
      ref={stageRef}
      className="slide-stage"
      style={{
        transform: `translate(${panX}px, ${panY}px) scale(${zoomScale})`,
      }}
    >
      <div
        className="slide-content"
        style={{
          opacity,
          transition: fadeMs > 0 ? `opacity ${fadeMs}ms ease` : undefined,
        }}
      >
        <canvas ref={canvasRef} className="slide" />
      </div>
      {!currentReady ? <div className="slide-loading" aria-hidden /> : null}
      {pointer}
    </div>
  )
}
