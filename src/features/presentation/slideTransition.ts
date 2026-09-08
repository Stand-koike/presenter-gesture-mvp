/** Default slide fade duration (ms). */
export const SLIDE_TRANSITION_MS = 180

export function getSlideTransitionMs(reducedMotion: boolean): number {
  return reducedMotion ? 0 : SLIDE_TRANSITION_MS
}
