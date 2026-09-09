import type { PresentationCommand } from '../presentation/commands'
import type { IntentContext } from './resolvePresentationIntent'
import { resolvePresentationIntent } from './resolvePresentationIntent'
import type { PresentationIntent } from './presentationIntent'
import type { ResolvedPresentationIntent } from './resolvePresentationIntent'

export type IntentApplyActions = {
  setPointerMode: (enabled: boolean) => void
  hidePointer: () => void
  dispatch: (command: PresentationCommand) => void
}

/** Applies a resolved intent to InteractionState and PresentationController. */
export function applyPresentationIntent(
  resolved: ResolvedPresentationIntent,
  actions: IntentApplyActions,
): void {
  switch (resolved.pointerTransition) {
    case 'ENTER_POINTER':
      actions.setPointerMode(true)
      break
    case 'EXIT_POINTER':
      actions.setPointerMode(false)
      actions.hidePointer()
      break
  }

  for (const command of resolved.commands) {
    actions.dispatch(command)
  }
}

/** Resolve then apply — convenience for discrete intents (keyboard, UI, gestures). */
export function handlePresentationIntent(
  intent: PresentationIntent,
  context: IntentContext,
  actions: IntentApplyActions,
): void {
  const resolved = resolvePresentationIntent(intent, context)
  if (!resolved) return
  applyPresentationIntent(resolved, actions)
}
