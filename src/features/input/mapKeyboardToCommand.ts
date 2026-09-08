import type { PresentationCommand, PresentationMode } from '../presentation/commands'

type KeyboardContext = {
  mode: PresentationMode
  isBlackScreen: boolean
}

function isPlainKey(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey
}

export function mapKeyboardToCommand(
  event: KeyboardEvent,
  { mode, isBlackScreen }: KeyboardContext,
): PresentationCommand | null {
  if (event.repeat && (event.key === 'Escape' || event.key.toLowerCase() === 'z')) {
    return null
  }

  if (event.key.toLowerCase() === 'b' && isPlainKey(event)) {
    return 'TOGGLE_BLACK_SCREEN'
  }

  if (event.key === 'Escape') {
    if (mode === 'ZOOM') return 'EXIT_ZOOM'
    if (isBlackScreen) return 'TOGGLE_BLACK_SCREEN'
    return 'EXIT_PRESENTATION'
  }

  if (isBlackScreen && event.key.toLowerCase() === 'z') {
    return null
  }

  if (event.key === 'ArrowRight' || event.key === ' ') {
    return 'NEXT_SLIDE'
  }
  if (event.key === 'ArrowLeft') {
    return 'PREVIOUS_SLIDE'
  }
  if (event.key.toLowerCase() === 'z') {
    return 'ENTER_ZOOM'
  }
  return null
}
