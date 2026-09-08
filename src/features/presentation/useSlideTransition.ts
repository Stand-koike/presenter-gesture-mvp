import { useEffect, useRef, useState } from 'react'
import { getSlideTransitionMs } from './slideTransition'

function readReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reducedMotion
}

/**
 * Runs a short fade-in after the slide canvas is blitted from cache.
 * Cache hit: blit immediately, then fade. Cache miss: opacity 0 until ready, then blit + fade.
 * Rapid page changes cancel in-flight fades via a monotonic token.
 */
export function useSlideTransition(
  page: number,
  currentReady: boolean,
  revision: number,
  blit: () => boolean,
) {
  const reducedMotion = usePrefersReducedMotion()
  const fadeMs = getSlideTransitionMs(reducedMotion)
  const [opacity, setOpacity] = useState(1)
  const tokenRef = useRef(0)
  const hasShownRef = useRef(false)

  useEffect(() => {
    const token = ++tokenRef.current

    if (!currentReady) {
      setOpacity(0)
      return
    }

    const applied = blit()
    if (!applied) return

    if (!hasShownRef.current || fadeMs === 0) {
      hasShownRef.current = true
      setOpacity(1)
      return
    }

    setOpacity(0)
    const frame = requestAnimationFrame(() => {
      if (token !== tokenRef.current) return
      setOpacity(1)
    })

    return () => cancelAnimationFrame(frame)
  }, [page, currentReady, revision, blit, fadeMs])

  return { opacity, fadeMs }
}
