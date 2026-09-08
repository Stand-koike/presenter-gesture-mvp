/** PDF page render scale (device-independent pixels). */
export const SLIDE_RENDER_SCALE = 2

/** Pages kept in memory: previous, current, next. */
export function getSlideWindowPages(center: number, pageCount: number): number[] {
  if (pageCount <= 0) return []
  const pages: number[] = []
  for (let page = center - 1; page <= center + 1; page += 1) {
    if (page >= 1 && page <= pageCount) pages.push(page)
  }
  return pages
}
