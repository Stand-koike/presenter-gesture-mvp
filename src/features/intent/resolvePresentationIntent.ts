import { isPointerInteraction, type InteractionState } from '../interaction/interactionState'
import type { PresentationCommand, PresentationMode } from '../presentation/commands'
import { isInteractionIntent, type PresentationIntent } from './presentationIntent'

export type IntentContext = {
  interactionState: InteractionState
  mode: PresentationMode
  isBlackScreen: boolean
}

export type PointerTransition = 'ENTER_POINTER' | 'EXIT_POINTER'

/** Resolved outcome — still no side effects until applyPresentationIntent(). */
export type ResolvedPresentationIntent = {
  pointerTransition?: PointerTransition
  commands: PresentationCommand[]
}

/**
 * Maps user intent + current context to executable results.
 * Does not mutate InteractionState or dispatch commands.
 */
export function resolvePresentationIntent(
  intent: PresentationIntent,
  context: IntentContext,
): ResolvedPresentationIntent | null {
  if (isInteractionIntent(intent)) {
    if (intent.action === 'TOGGLE_POINTER') {
      if (context.mode === 'ZOOM') {
        return null
      }
      if (isPointerInteraction(context.interactionState)) {
        return { pointerTransition: 'EXIT_POINTER', commands: [] }
      }
      return { pointerTransition: 'ENTER_POINTER', commands: [] }
    }
    return null
  }

  if (context.isBlackScreen && intent.command === 'ENTER_ZOOM') {
    return null
  }

  return { commands: [intent.command] }
}
