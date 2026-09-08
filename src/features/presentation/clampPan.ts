export type SlideViewport = {
  containerWidth: number
  containerHeight: number
  slideWidth: number
  slideHeight: number
}

export function clampPan(
  panX: number,
  panY: number,
  zoomScale: number,
  viewport: SlideViewport | null,
): { x: number; y: number } {
  if (!viewport || zoomScale <= 1) {
    return { x: 0, y: 0 }
  }

  const { containerWidth, containerHeight, slideWidth, slideHeight } = viewport
  if (containerWidth <= 0 || containerHeight <= 0 || slideWidth <= 0 || slideHeight <= 0) {
    return { x: panX, y: panY }
  }

  const fit = Math.min(containerWidth / slideWidth, containerHeight / slideHeight, 1)
  const displayedWidth = slideWidth * fit * zoomScale
  const displayedHeight = slideHeight * fit * zoomScale
  const maxX = Math.max(0, (displayedWidth - containerWidth) / 2)
  const maxY = Math.max(0, (displayedHeight - containerHeight) / 2)

  return {
    x: Math.min(maxX, Math.max(-maxX, panX)),
    y: Math.min(maxY, Math.max(-maxY, panY)),
  }
}
