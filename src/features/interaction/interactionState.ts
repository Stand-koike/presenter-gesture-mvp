export type InteractionState = 'NORMAL' | 'POINTER' | 'NAVIGATION' | 'ANNOTATION'

export const DEFAULT_INTERACTION_STATE: InteractionState = 'NORMAL'

export function isPointerInteraction(state: InteractionState): boolean {
  return state === 'POINTER'
}

export function interactionStateLabel(state: InteractionState): string {
  return state
}
