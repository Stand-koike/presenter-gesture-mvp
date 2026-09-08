import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerSrc from '../../pdf.worker?worker&url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export function usePdfDocument(pdfUrl: string) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPdfDocument(null)
    setPageCount(0)
    setError(null)

    const loadingTask = pdfjsLib.getDocument(pdfUrl)

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) {
          void pdf.destroy()
          return
        }
        setPdfDocument(pdf)
        setPageCount(pdf.numPages)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      cancelled = true
      void loadingTask.destroy()
    }
  }, [pdfUrl])

  return { pdfDocument, pageCount, error }
}
