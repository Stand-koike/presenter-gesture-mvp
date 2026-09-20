import { useCallback, useEffect, useRef, useState } from 'react'
import type { GestureRuntimeSnapshot } from '../gesture/cameraStatus'
import { GestureController } from '../gesture/GestureController'
import { useGestureSettings } from '../gesture/useGestureSettings'
import { indexFingerFromLandmarks } from './handCoords'

const NOTE_RADIUS_PX = 52
const FINGER_RADIUS_PX = 28
const MARGIN = 0.1

const PITCHES_HZ = [261.63, 329.63, 392, 523.25] // C4, E4, G4, C5

type NoteState = {
  x: number
  y: number
  pitchIndex: number
}

function randomNote(): NoteState {
  return {
    x: MARGIN + Math.random() * (1 - MARGIN * 2),
    y: MARGIN + Math.random() * (1 - MARGIN * 2),
    pitchIndex: Math.floor(Math.random() * PITCHES_HZ.length),
  }
}

function playShortTone(ctx: AudioContext, frequencyHz: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequencyHz
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.24)
}

type Props = {
  onBack: () => void
}

export function OtohiroiGame({ onBack }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const { gestureConfig } = useGestureSettings()
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null)
  const [note, setNote] = useState<NoteState>(() => randomNote())
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
  const [cameraError, setCameraError] = useState<string | null>(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new AudioContext()
    }
    void audioRef.current.resume()
    return audioRef.current
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      const rect = stage.getBoundingClientRect()
      setStageSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const handleStatusChange = useCallback((snapshot: GestureRuntimeSnapshot) => {
    setFinger(indexFingerFromLandmarks(snapshot.landmarks))
  }, [])

  useEffect(() => {
    if (!finger) return

    const fx = finger.x * stageSize.width
    const fy = finger.y * stageSize.height
    const nx = note.x * stageSize.width
    const ny = note.y * stageSize.height
    const dist = Math.hypot(fx - nx, fy - ny)
    if (dist > NOTE_RADIUS_PX + FINGER_RADIUS_PX) return

    const ctx = ensureAudio()
    playShortTone(ctx, PITCHES_HZ[note.pitchIndex])
    setNote(randomNote())
  }, [finger, note, stageSize, ensureAudio])

  useEffect(() => {
    return () => {
      void audioRef.current?.close()
      audioRef.current = null
    }
  }, [])

  return (
    <main className="otohiroi">
      <header className="otohiroi-header">
        <h1 className="otohiroi-title">おとひろい</h1>
        <button type="button" className="otohiroi-back" onClick={onBack}>
          もどる
        </button>
      </header>

      <div ref={stageRef} className="otohiroi-stage" aria-label="おとひろいプレイ画面">
        <span
          className="otohiroi-note"
          style={{
            left: `${note.x * 100}%`,
            top: `${note.y * 100}%`,
            width: NOTE_RADIUS_PX * 2,
            height: NOTE_RADIUS_PX * 2,
            marginLeft: -NOTE_RADIUS_PX,
            marginTop: -NOTE_RADIUS_PX,
            fontSize: NOTE_RADIUS_PX * 1.35,
            lineHeight: `${NOTE_RADIUS_PX * 2}px`,
          }}
          aria-hidden
        >
          ♪
        </span>
        {finger ? (
          <span
            className="otohiroi-finger"
            style={{
              left: `${finger.x * 100}%`,
              top: `${finger.y * 100}%`,
              width: FINGER_RADIUS_PX * 2,
              height: FINGER_RADIUS_PX * 2,
              marginLeft: -FINGER_RADIUS_PX,
              marginTop: -FINGER_RADIUS_PX,
            }}
            aria-hidden
          />
        ) : null}
      </div>

      {cameraError ? <p className="otohiroi-error">{cameraError}</p> : null}

      <GestureController
        enabled
        gesturesActive={false}
        gestureConfig={gestureConfig}
        presentationMode="PRESENTATION"
        onStatusChange={handleStatusChange}
        onRuntimeError={setCameraError}
      />
    </main>
  )
}
