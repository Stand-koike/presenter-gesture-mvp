import type { PresentationCommand } from '../presentation/commands'
import { isPointerInteraction, type InteractionState } from './interactionState'

/**
 * Thin router between gesture recognition and presentation commands.
 * Returns commands only; does not touch Presentation Controller state.
 */
export function routeInteractionCommands(
  interactionState: InteractionState,
  navigationCommand: PresentationCommand | null,
  pointerCommand: PresentationCommand | null,
): PresentationCommand[] {
  if (isPointerInteraction(interactionState)) {
    return pointerCommand ? [pointerCommand] : []
  }

  const commands: PresentationCommand[] = []
  if (navigationCommand) commands.push(navigationCommand)
  return commands
}
