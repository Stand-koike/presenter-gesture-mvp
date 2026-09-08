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
- **Only in PRESENTATION mode**

## G04 Fist
Action: `EXIT_ZOOM`
- Middle/ring/pinky folded
- Stable for `fist.stableFrames` (3), held for `fist.holdMs` (400 ms)
- Latched: holding fist does not repeat `EXIT_ZOOM`
- **Only effective in ZOOM mode** (no action in normal mode)

## G05 Hand Pan
Action: `PAN { dx, dy }`
- Active only in ZOOM mode
- Wrist displacement with EMA smoothing + dead zone
- **Swipe page navigation is disabled while zoomed**

## Priority

### PRESENTATION mode
1. Active horizontal swipe motion → swipe only
2. Fist (no effect)
3. OK Sign → ENTER_ZOOM
4. Swipe evaluation
5. Pointer → continuous `MOVE_POINTER` (when Pointer Mode ON)

### ZOOM mode
1. Fist → EXIT_ZOOM
2. Pan (continuous)
3. Swipe disabled
4. Pointer hidden

## G06 Pointer / Laser (Phase 5-A)

Action: `MOVE_POINTER { x, y, visible }`

- **Pointer Mode** must be ON (UI checkbox or `P` key). Default: OFF.
- Uses index finger tip landmark 8 (normalized 0–1).
- X is mirrored (`MIRROR_LANDMARK_X`) so moving the hand right moves the pointer right.
- EMA smoothing (`pointer.emaAlpha` default 0.38) with minimum move threshold to reduce jitter.
- Hand lost → `visible: false` (pointer hidden, not frozen).
- Hand re-detected → pointer reappears at new position.
- **Only in PRESENTATION mode** — hidden automatically in ZOOM mode.
- Camera video is never shown to the audience; only the pointer overlay on the slide.
- Swipe still uses wrist (landmark 0); pointer tracking does not replace swipe logic.
