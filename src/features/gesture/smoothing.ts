/** Exponential moving average for normalized 2D points. */
export function emaPoint(
  previous: { x: number; y: number } | null,
  next: { x: number; y: number },
  alpha: number,
): { x: number; y: number } {
  if (!previous) return next
  return {
    x: previous.x * (1 - alpha) + next.x * alpha,
    y: previous.y * (1 - alpha) + next.y * alpha,
  }
}
