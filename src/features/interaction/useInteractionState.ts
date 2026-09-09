import { useCallback, useState } from 'react'
import {
  DEFAULT_INTERACTION_STATE,
  isPointerInteraction,
  type InteractionState,
} from './interactionState'

/**
 * Runtime interaction mode for the current presentation session.
 * Always starts at NORMAL when the hook mounts (presentation entry).
 * `InteractionState === 'POINTER'` is the canonical pointer-on state.
 */
export function useInteractionState() {
  const [interactionState, setInteractionState] =
    useState<InteractionState>(DEFAULT_INTERACTION_STATE)

  const setPointerMode = useCallback((enabled: boolean) => {
    const next: InteractionState = enabled ? 'POINTER' : 'NORMAL'
    setInteractionState(next)
  }, [])

  return {
    interactionState,
    isPointerMode: isPointerInteraction(interactionState),
    setPointerMode,
  }
}
