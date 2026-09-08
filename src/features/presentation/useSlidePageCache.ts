import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { getSlideWindowPages, SLIDE_RENDER_SCALE } from './slidePageCache'

export type SlideCacheDebug = {
  cachedPages: number[]
  currentReady: boolean
  lastRenderMs: number | null
}

type PageDimensions = { width: number; height: number }

type InflightJob = {
  cancel: () => void
}

function syncDebugState(
  cache: Map<number, HTMLCanvasElement>,
  page: number,
  lastRenderMs: number | null,
): SlideCacheDebug {
  return {
    cachedPages: [...cache.keys()].sort((a, b) => a - b),
    currentReady: cache.has(page),
    lastRenderMs,
  }
}

/**
 * Keeps a three-page window (prev / current / next) of offscreen canvases.
 * The visible canvas receives a blit from the cache entry for the current page.
 */
export function useSlidePageCache(
  pdfDocument: PDFDocumentProxy | null,
  page: number,
  pageCount: number,
) {
  const cacheRef = useRef(new Map<number, HTMLCanvasElement>())
  const dimsRef = useRef(new Map<number, PageDimensions>())
  const inflightRef = useRef(new Map<number, InflightJob>())
  const pageRef = useRef(page)
  const pageCountRef = useRef(pageCount)
  const pdfRef = useRef(pdfDocument)
  const lastRenderMsRef = useRef<number | null>(null)

  const [revision, setRevision] = useState(0)
  const [currentReady, setCurrentReady] = useState(false)
  const [debug, setDebug] = useState<SlideCacheDebug>(() =>
    syncDebugState(cacheRef.current, page, null),
  )

  pageRef.current = page
  pageCountRef.current = pageCount
  pdfRef.current = pdfDocument

  const bump = useCallback(() => setRevision((value) => value + 1), [])

  const updateDebug = useCallback(() => {
    setDebug(syncDebugState(cacheRef.current, pageRef.current, lastRenderMsRef.current))
  }, [])

  const clearCache = useCallback(() => {
    for (const job of inflightRef.current.values()) job.cancel()
    inflightRef.current.clear()
    cacheRef.current.clear()
    dimsRef.current.clear()
    setCurrentReady(false)
    updateDebug()
  }, [updateDebug])

  const evictOutsideWindow = useCallback((center: number, total: number) => {
    const keep = new Set(getSlideWindowPages(center, total))
    for (const cachedPage of [...cacheRef.current.keys()]) {
      if (!keep.has(cachedPage)) cacheRef.current.delete(cachedPage)
    }
    for (const cachedPage of [...dimsRef.current.keys()]) {
      if (!keep.has(cachedPage)) dimsRef.current.delete(cachedPage)
    }
    for (const cachedPage of [...inflightRef.current.keys()]) {
      if (!keep.has(cachedPage)) {
        inflightRef.current.get(cachedPage)?.cancel()
        inflightRef.current.delete(cachedPage)
      }
    }
  }, [])

  const renderPage = useCallback(
    (pageNum: number) => {
      const pdf = pdfRef.current
      if (!pdf || cacheRef.current.has(pageNum) || inflightRef.current.has(pageNum)) return

      let renderTask: RenderTask | null = null
      let cancelled = false

      const cancel = () => {
        cancelled = true
        renderTask?.cancel()
        inflightRef.current.delete(pageNum)
      }

      inflightRef.current.set(pageNum, { cancel })
      const startedAt = performance.now()

      void (async () => {
        try {
          const pdfPage = await pdf.getPage(pageNum)
          if (cancelled) return

          const viewport = pdfPage.getViewport({ scale: SLIDE_RENDER_SCALE })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const context = canvas.getContext('2d')
          if (!context || cancelled) return

          renderTask = pdfPage.render({
            canvasContext: context,
            canvas,
            viewport,
          })

          await renderTask.promise
          if (cancelled) return

          const windowPages = getSlideWindowPages(pageRef.current, pageCountRef.current)
          if (!windowPages.includes(pageNum)) return

          cacheRef.current.set(pageNum, canvas)
          dimsRef.current.set(pageNum, { width: viewport.width, height: viewport.height })
          inflightRef.current.delete(pageNum)
          lastRenderMsRef.current = Math.round(performance.now() - startedAt)

          if (pageNum === pageRef.current) {
            setCurrentReady(true)
          }
          bump()
          updateDebug()
        } catch {
          if (!cancelled) inflightRef.current.delete(pageNum)
        }
      })()
    },
    [bump, updateDebug],
  )

  useEffect(() => {
    if (!pdfDocument || pageCount <= 0) {
      clearCache()
      return
    }

    evictOutsideWindow(page, pageCount)

    const cached = cacheRef.current.has(page)
    setCurrentReady(cached)
    if (cached) bump()

    renderPage(page)

    for (const neighbor of getSlideWindowPages(page, pageCount)) {
      if (neighbor !== page) {
        queueMicrotask(() => renderPage(neighbor))
      }
    }

    updateDebug()
  }, [pdfDocument, page, pageCount, bump, clearCache, evictOutsideWindow, renderPage, updateDebug])

  useEffect(() => () => clearCache(), [clearCache])

  const applyToCanvas = useCallback((target: HTMLCanvasElement | null, pageNum: number): boolean => {
    if (!target || pageNum !== pageRef.current) return false

    const source = cacheRef.current.get(pageNum)
    const dims = dimsRef.current.get(pageNum)
    if (!source || !dims) return false

    target.width = dims.width
    target.height = dims.height
    const context = target.getContext('2d')
    if (!context) return false
    context.drawImage(source, 0, 0)
    return true
  }, [])

  return {
    revision,
    currentReady,
    debug,
    applyToCanvas,
  }
}
