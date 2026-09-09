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

## Interaction State (Phase 5-C-3)

Runtime input mode lives in `src/features/interaction/`, separate from Presentation Controller.

```text
GestureRecognizer
  → interactionRouter.routeInteractionCommands()
  → PresentationCommand
  → dispatch()
```

- `InteractionState`: `NORMAL` | `POINTER` | `NAVIGATION` | `ANNOTATION` (latter two reserved)
- Canonical pointer-on state: `InteractionState === 'POINTER'`
- `NORMAL`: navigation gestures (swipe, OK, zoom entry) active; pointer tracking inactive
- `POINTER`: `MOVE_POINTER` only; navigation gestures gated in recognizer + router
- V sign (2 fingers) + 400ms hold toggles `NORMAL` ↔ `POINTER` via `observeInteractionGesture()` (independent from `observe()`)
- **Presentation entry always starts with `InteractionState === 'NORMAL'`** — pointer mode is not restored from localStorage
- Pointer mode changes only during a session via P key / UI / V sign (`TOGGLE_POINTER` intent)
- Black Screen and Zoom (`PresentationMode`) are unchanged and orthogonal

### Zoom behavior (Phase 5-D-2)

- Enter: Keyboard `Z` or OK sign → `ENTER_ZOOM` → default **2x** scale
- Exit: Fist or `Escape` → scale 1, pan 0
- **NEXT/PREV via `dispatch`**: if `PresentationMode === 'ZOOM'`, `resetZoomState()` runs before page change (same end state as exit zoom)
- **Enter zoom**: `hidePointer()` + `onEnterZoom()` callback → InteractionState `NORMAL` (Pointer mode off)
- **Laser toggle during zoom**: `TOGGLE_POINTER` intent resolves to no-op (`P`, UI); V sign is inactive in ZOOM mode
- Zoom pan/swipe gating remains in `GestureRecognizer`; page-turn zoom reset is centralized in `usePresentationController.dispatch()`

### Pointer mode vs persistent settings (Phase 5-C-10)

```text
useGestureSettings (localStorage)
  → gesture configuration only (sensitivity, cooldown, debug, gesture on/off)

useInteractionState
  → runtime interaction mode (NORMAL | POINTER)
  → always NORMAL when PresentationViewer mounts
```

Pointer runtime state is **not** written to or read from localStorage.

### Laser Pointer visual (Phase 5-E)

- User-facing UX name: **Laser Pointer**; code identifiers unchanged (`POINTER`, `MOVE_POINTER`, `SlidePointer`)
- Rendered as a DOM overlay (`SlidePointer` + `.slide-pointer` CSS) inside `.slide-stage` (same transform as zoom/pan)
- No Intent/Command/Recognizer changes; visual polish and UI labels only
- No pulse, trail, or animation; position follows existing EMA + `MOVE_POINTER` stream with no CSS transition

## Presentation Intent Layer (Phase 5-C-5)

Discrete user actions flow through `src/features/intent/` before mutating state:

```text
Input / Gesture
  → PresentationIntent (no side effects)
  → resolvePresentationIntent(context)
  → ResolvedPresentationIntent
  → applyPresentationIntent(actions)
  → InteractionState change and/or dispatch()
```

- Interaction intents (e.g. `TOGGLE_POINTER`) are resolved against current `InteractionState`
- Presentation intents wrap existing `PresentationCommand` values (no duplicate command strings)
- Streaming commands (`MOVE_POINTER`, `PAN`) bypass the intent layer: `interactionRouter` → `dispatch()`
- P key, UI checkbox, and V sign all emit the same `TOGGLE_POINTER` interaction intent

## Security
Electron renderer runs with:
- contextIsolation: true
- nodeIntegration: false
- sandbox: true

Do not expose Node APIs to the renderer unless a later requirement explicitly needs them.
