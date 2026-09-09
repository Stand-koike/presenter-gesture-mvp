# SPEC — Presenter Gesture MVP

## 1. Product
A desktop presentation viewer optimized for hands-free operation using the PC's built-in camera.

## 2. MVP goal
Demonstrate reliable non-contact slide navigation and basic zoom control.

## 3. Target
Presenters using a laptop in a room where a conventional clicker is inconvenient.

## 4. Supported input
- Local PDF
- Built-in webcam (optional ON/OFF during presentation)
- Keyboard fallback (always available)

## 5. Presentation
- Open PDF
- Render one page at a time
- Three-page pre-render cache (previous / current / next) for faster page turns
- Short opacity fade (~180ms) on page change; disabled when `prefers-reduced-motion: reduce`
- Full-screen presentation view
- Current page / total pages
- Escape exits zoom first, then black screen, then presentation
- Black screen (`B`): full-screen `#000` overlay; hides slides, pointer, and UI from the audience
- Camera status indicator (no audience-facing camera feed)

## 6. Gesture actions
- Right swipe -> next
- Left swipe -> previous
- OK sign -> enter zoom
- Fist -> exit zoom (zoom mode only)
- In zoom mode, hand movement -> pan
- Laser Pointer (optional): index finger tip -> laser dot on slide (internal: Pointer mode / `MOVE_POINTER`)

## 6.1 Zoom (Phase 5-D-2)
- Enter: Keyboard `Z` or OK sign gesture
- Default zoom scale: **2x** (MVP; range 1x–3x in constants, no in-session scale change UI)
- Pan: wrist movement in zoom mode only; swipe navigation is disabled in zoom mode
- Exit: Fist gesture (zoom mode only) or `Escape` (first priority while zoomed)
- On exit: `PresentationMode` returns to `PRESENTATION`, scale **1x**, pan **(0, 0)**
- **On NEXT/PREV (any path through `dispatch`)**: if zoomed, zoom is fully reset before the page changes
- **On enter zoom**: pointer overlay hidden; runtime InteractionState set to `NORMAL` (Pointer mode off)
- Zoom uses `PresentationMode` / Controller state — **not** `InteractionState` (`NORMAL` | `POINTER` only)

## 7. Laser Pointer (Phase 5-A / 5-E)
- User-facing name: **Laser Pointer**; internal state remains `InteractionState === 'POINTER'`
- Toggle: Presentation UI checkbox, `P` key, or V sign (`TOGGLE_POINTER` intent)
- Default at presentation entry: **NORMAL (off)**; not restored from localStorage
- Normalized coordinates (0–1) mapped to slide overlay (`SlidePointer` DOM overlay)
- Visual: small red core, subtle glow, dark edge ring for contrast on light slides (Phase 5-E)
- Hidden in zoom mode and when no hand is detected
- Entering zoom turns Laser Pointer off (InteractionState `NORMAL`)
- Laser Pointer toggle (`P`, UI, V sign) is ignored while `PresentationMode === 'ZOOM'`

## 8. Black Screen (Phase 5-C-2)
- Toggle: `B` key or Presentation UI button
- Full-screen black overlay; PDF cache and zoom/pan state are preserved
- Gestures disabled while active; keyboard navigation (arrows/space) still works
- Pointer hidden while active; restored on exit if it was visible before
- Escape priority: Zoom exit → Black Screen off → Exit presentation

## 9. Safety / reliability
- Configurable swipe sensitivity (Low / Medium / High)
- Configurable discrete gesture cooldown (Short / Medium / Long)
- Multi-frame gesture confirmation for swipe, OK, and fist
- Gesture ON/OFF without stopping PDF or keyboard control
- Gesture recognition must not block keyboard controls
- Camera stream is never shown to the audience

## 10. Camera states (Phase 4)
- Camera Off — gesture disabled by user
- Camera Starting — initialization
- No Hand — camera ready, no hand detected
- Hand Detected — ready for gestures
- Camera Error — permission / device / WASM / model failure; keyboard still works

## 11. Non-goals
- PPTX editing
- Slide authoring
- Cloud sync
- Accounts
- AI
- Voice control
- Multi-hand gestures
- Custom gesture training
