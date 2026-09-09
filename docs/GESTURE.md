# GESTURE — MVP

## Configuration (Phase 4)

Settings are defined in `src/features/gesture/gestureConfig.ts` and persisted in `localStorage`.

### Swipe sensitivity
Scales `swipe.minDx` and `swipe.motionLockDx`.

| Level | Effect |
| --- | --- |
| Low | Requires larger horizontal motion |
| Medium | Default (base thresholds) |
| High | Smaller motion triggers swipe |

### Cooldown
Scales `discreteCooldownMs` for discrete gestures.

| Level | Duration |
| --- | --- |
| Short | 500 ms |
| Medium | 800 ms (default) |
| Long | 1200 ms |

PAN commands are not affected by discrete cooldown.

## G01 Right Swipe
Action: `NEXT_SLIDE`
- Wrist landmark 0, normalized coordinates (X mirrored for webcam)
- Horizontal displacement >= `swipe.minDx` (Medium default: 0.12)
- Vertical movement smaller than horizontal
- Completed within `swipe.maxDurationMs` (700 ms)
- Multi-frame trajectory with monotonic direction check
- Discrete cooldown after recognition
- **Disabled in ZOOM mode**

## G02 Left Swipe
Action: `PREVIOUS_SLIDE`
- Same rules as G01, negative horizontal direction
- **Disabled in ZOOM mode**

## G03 OK Sign
Action: `ENTER_ZOOM`
- Thumb/index distance < `ok.thumbIndexMaxDistance` (0.07)
- Index curled; middle/ring/pinky extended
- Stable for `ok.stableFrames` (3) before hold timer starts
- Held for `ok.holdMs` (500 ms)
- Latched: holding OK does not repeat `ENTER_ZOOM`
- **Only in PRESENTATION mode** (disabled in POINTER interaction mode via `observe()` early return)
- On enter: default **2x** zoom; Laser Pointer off (InteractionState `NORMAL`)

## G04 Fist
Action: `EXIT_ZOOM`
- Middle/ring/pinky folded
- Stable for `fist.stableFrames` (3), held for `fist.holdMs` (400 ms)
- Latched: holding fist does not repeat `EXIT_ZOOM`
- **Only effective in ZOOM mode** (no action in normal mode)
- Resets scale to 1x and pan to (0, 0)

## G05 Hand Pan
Action: `PAN { dx, dy }`
- Active only in ZOOM mode
- Wrist displacement with EMA smoothing + dead zone
- **Swipe page navigation is disabled while zoomed**
- Keyboard NEXT/PREV while zoomed exits zoom before page change (Controller)

## Priority

### PRESENTATION mode
1. Active horizontal swipe motion → swipe only
2. Fist (no effect)
3. OK Sign → ENTER_ZOOM
4. Swipe evaluation
5. Laser Pointer → continuous `MOVE_POINTER` (when Laser Pointer ON)

### ZOOM mode
1. Fist → EXIT_ZOOM
2. Pan (continuous)
3. Swipe disabled
4. Laser Pointer hidden

## G07 V Sign — Laser Pointer Toggle (Phase 5-C-4)
Action: toggle `NORMAL` ↔ `POINTER` via `TOGGLE_POINTER` PresentationIntent (P key / UI / V sign share the same intent path)
- Index + middle extended; ring + pinky folded; thumb not evaluated
- Stable 3 frames, hold 400ms, latched until release, interaction cooldown 800ms (default)
- Detected only in `observeInteractionGesture()` — never re-enables navigation `observe()` in POINTER mode
- GestureController emits `createTogglePointerIntent()` → `onPresentationIntent`
- P key remains as immediate fallback toggle

## G06 Laser Pointer (Phase 5-A / 5-E)

Action: `MOVE_POINTER { x, y, visible }`

- **Laser Pointer** must be ON during a presentation session (UI checkbox or `P` key / V sign). Internal mode: `InteractionState === 'POINTER'`. **Default at presentation entry: NORMAL (OFF).** Not persisted across sessions.
- Uses index finger tip landmark 8 (normalized 0–1).
- X is mirrored (`MIRROR_LANDMARK_X`) so moving the hand right moves the pointer right.
- EMA smoothing (`pointer.emaAlpha` default 0.38) with minimum move threshold to reduce jitter.
- Hand lost → `visible: false` (pointer hidden, not frozen).
- Hand re-detected → pointer reappears at new position.
- **Only in PRESENTATION mode** — hidden automatically in ZOOM mode.
- Camera video is never shown to the audience; only the laser pointer overlay on the slide.
- Phase 5-E: presentation laser dot (red core + subtle glow); no trail/pulse animation.
- Swipe still uses wrist (landmark 0); pointer tracking does not replace swipe logic.
