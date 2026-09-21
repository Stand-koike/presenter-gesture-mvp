import { useCallback, useRef, useState } from 'react'
import { GestureController } from './features/gesture/GestureController'
import { useGestureSettings } from './features/gesture/useGestureSettings'
import { PresentationViewer } from './features/presentation/PresentationViewer'

export function App() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { gestureConfig } = useGestureSettings()

  const openPdf = useCallback(() => inputRef.current?.click(), [])

  const exitPresentation = useCallback(() => {
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }, [])

  if (pdfUrl) {
    return (
      <PresentationViewer
        pdfUrl={pdfUrl}
        onExit={exitPresentation}
      />
    )
  }

  return (
    <main className="app home">
      <section className="home-card">
        <h1>Presenter Gesture</h1>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setPdfUrl(URL.createObjectURL(file))
            e.target.value = ''
            void document.documentElement.requestFullscreen().catch(() => {})
          }}
        />
        <button className="primary" type="button" onClick={openPdf}>
          PDFを開く
        </button>
        <GestureController
          enabled
          gestureConfig={gestureConfig}
          showHomeDebug
        />
      </section>
    </main>
  )
}
