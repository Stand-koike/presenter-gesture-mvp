# Cursor Implementation Prompt — Presenter Gesture MVP

You are implementing the Presenter Gesture MVP in this repository.

Read these files first:
- README.md
- docs/SPEC.md
- docs/GESTURE.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md

## Objective
Make the application runnable locally and complete the MVP described in the docs.

## Constraints
1. Use TypeScript, React, Vite, Electron.
2. Keep Electron secure: contextIsolation=true, nodeIntegration=false, sandbox=true.
3. Keep gesture recognition separate from presentation state.
4. Gesture recognition emits semantic commands/events; it must not directly manipulate unrelated UI.
5. Keyboard fallback must always work.
6. Camera video must never be visible to the audience.
7. Do not add authentication, cloud storage, PPTX editing, AI, voice control, or unrelated UI.
8. Do not replace MediaPipe with a custom ML model.
9. Do not add Tailwind unless it provides a concrete benefit; functional MVP first.

## First tasks
1. Inspect the repository and identify missing dependencies/files.
2. Install dependencies.
3. Ensure `npm run dev` starts Electron + Vite.
4. Add a clear model-loading error if `public/models/hand_landmarker.task` is missing.
5. Implement reliable PDF rendering and page navigation.
6. Implement camera permission/error handling.
7. Implement G01-G05 exactly as documented.
8. Fix the current zoom-pan behavior so panning only happens while zoom mode is active.
9. Add a presentation-start flow that enters full-screen after the user chooses a PDF.
10. Add a small non-audience-facing diagnostic HUD that can be toggled with a developer/debug setting.

## Gesture engineering requirements
- Use normalized landmark coordinates.
- Ignore gestures when no hand is confidently detected.
- Require thresholds to be satisfied over more than one frame where practical.
- Apply an 800ms cooldown after discrete gestures.
- Prevent one physical swipe from generating multiple page turns.
- Prefer wrist/hand-center velocity over raw absolute screen position.
- Add a simple confidence score or equivalent gating before discrete commands.
- Keep thresholds as named constants so they can be tuned without restructuring the recognizer.

## Presentation engineering requirements
- Never reload the entire PDF document for every frame.
- Cache the loaded PDF document.
- Render only the active page initially.
- Keep previous/next pre-rendering as a later optimization unless needed for acceptable performance.
- Clamp page number between 1 and pageCount.
- Zoom must have a bounded range, e.g. 1x–3x.
- Pan must be clamped so the slide cannot be moved completely off-screen.

## Validation
After implementation:
- Run TypeScript/build checks.
- Run the app.
- Test keyboard navigation.
- Test PDF loading.
- Test camera permission denial.
- Test camera permission approval.
- Test left/right swipe.
- Test OK sign.
- Test fist.
- Test zoom pan.
- Verify Escape behavior.

## Output
At the end, summarize:
- files changed
- commands run
- tests passed
- remaining issues
- exact next recommended task

Do not rewrite the architecture unless a concrete technical blocker requires it.
