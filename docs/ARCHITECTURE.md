# ARCHITECTURE

## Layers

Camera
-> MediaPipe HandLandmarker
-> GestureRecognizer
-> Gesture Event
-> Presentation Controller
-> PDF Renderer

## Principle
Gesture recognition must emit semantic commands rather than directly manipulate UI.

Example:
`NEXT_SLIDE` rather than `setPage(page + 1)`.

This allows future keyboard, voice, remote-control, and accessibility inputs to reuse the same command layer.

## PDF rendering (Phase 5-B)

Page navigation still flows through Presentation Controller commands (`NEXT_SLIDE` / `PREVIOUS_SLIDE`).

`SlideViewer` uses `useSlidePageCache` to maintain a three-page window:

```text
previous | current | next
```

- Offscreen canvases are rendered with PDF.js and stored in a `Map<page, HTMLCanvasElement>`.
- The visible canvas receives a `drawImage` blit from the cache entry for the current page.
- On page change, cached neighbors display instantly; missing pages render in the background.
- Pages outside the window are evicted; in-flight renders for evicted pages are cancelled.
- Current page render is prioritized; neighbors preload via `queueMicrotask`.

## Slide transition (Phase 5-C-1)

After a cache blit (`drawImage`), the slide canvas fades in over ~180ms via `.slide-content` opacity.

- Cache hit: blit first, then fade (no wait for PDF.js).
- Cache miss: opacity stays 0 until render completes, then blit + fade.
- Rapid page changes cancel in-flight fades with a token; only the latest page is shown.
- Zoom transform applies to `.slide-stage`; fade applies to `.slide-content` only.
- Pointer overlay is a sibling of `.slide-content` and is not faded.
- `prefers-reduced-motion: reduce` disables the fade.

This avoids full-document caching while making prev/next navigation feel immediate after the first preload pass.

## Black Screen (Phase 5-C-2)

`TOGGLE_BLACK_SCREEN` is handled in Presentation Controller (`isBlackScreen` state).

```text
Keyboard / UI button
  → TOGGLE_BLACK_SCREEN
  → Presentation Controller
  → BlackScreenOverlay (#000, z-index 100)
```

- SlideViewer and PDF cache stay mounted; only the overlay hides content from the audience.
- Zoom scale and pan are preserved across black screen on/off.
- GestureController sets `gesturesActive={false}` during black screen (camera/MediaPipe keep running).
- Pointer visibility is saved before entering black screen and restored on exit when appropriate.
- No slide fade transition is applied to black screen toggles.

## Security
Electron renderer runs with:
- contextIsolation: true
- nodeIntegration: false
- sandbox: true

Do not expose Node APIs to the renderer unless a later requirement explicitly needs them.
