import type { PresentationCommand } from '../presentation/commands'

export type InteractionIntentAction = 'TOGGLE_POINTER'

export type InteractionIntent = {
  scope: 'interaction'
  action: InteractionIntentAction
}

export type PresentationEffectIntent = {
  scope: 'presentation'
  command: PresentationCommand
}

/** User intent — no side effects; resolved by resolvePresentationIntent(). */
export type PresentationIntent = InteractionIntent | PresentationEffectIntent

export function isInteractionIntent(intent: PresentationIntent): intent is InteractionIntent {
  return intent.scope === 'interaction'
}

export function createTogglePointerIntent(): InteractionIntent {
  return { scope: 'interaction', action: 'TOGGLE_POINTER' }
}

export function createNextSlideIntent(): PresentationEffectIntent {
  return { scope: 'presentation', command: 'NEXT_SLIDE' }
}

export function createPreviousSlideIntent(): PresentationEffectIntent {
  return { scope: 'presentation', command: 'PREVIOUS_SLIDE' }
}

export function createToggleBlackScreenIntent(): PresentationEffectIntent {
  return { scope: 'presentation', command: 'TOGGLE_BLACK_SCREEN' }
}
