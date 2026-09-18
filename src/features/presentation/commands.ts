export type PresentationMode = 'PRESENTATION' | 'ZOOM'

export type PanCommand = {
  type: 'PAN'
  dx: number
  dy: number
}

export type ZoomDeltaCommand = {
  type: 'ZOOM_DELTA'
  dScale: number
}

export type MovePointerCommand = {
  type: 'MOVE_POINTER'
  x: number
  y: number
  visible: boolean
}

/**
 * Semantic presentation commands.
 * Keyboard, gestures, and future inputs all emit these instead of mutating UI state.
 */
export type PresentationCommand =
  | 'NEXT_SLIDE'
  | 'PREVIOUS_SLIDE'
  | 'EXIT_PRESENTATION'
  | 'ENTER_ZOOM'
  | 'EXIT_ZOOM'
  | 'TOGGLE_BLACK_SCREEN'
  | PanCommand
  | ZoomDeltaCommand
  | MovePointerCommand

export function isPanCommand(command: PresentationCommand): command is PanCommand {
  return typeof command === 'object' && command.type === 'PAN'
}

export function isZoomDeltaCommand(command: PresentationCommand): command is ZoomDeltaCommand {
  return typeof command === 'object' && command.type === 'ZOOM_DELTA'
}

export function isMovePointerCommand(command: PresentationCommand): command is MovePointerCommand {
  return typeof command === 'object' && command.type === 'MOVE_POINTER'
}

export function commandLabel(command: PresentationCommand): string {
  if (isPanCommand(command)) return 'PAN'
  if (isZoomDeltaCommand(command)) return 'ZOOM_DELTA'
  if (isMovePointerCommand(command)) {
    return command.visible ? 'MOVE_POINTER' : 'HIDE_POINTER'
  }
  return command
}
