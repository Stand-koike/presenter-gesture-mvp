# Presenter Gesture MVP

PDF presentation viewer controlled by PC camera hand gestures.

## Stack
- Electron
- React + TypeScript
- Vite
- PDF.js (`pdfjs-dist`)
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- Tailwind CSS is intentionally deferred until the functional MVP is stable.

## MVP
1. Open a local PDF.
2. Display slides full-screen.
3. Use built-in camera for hand tracking.
4. Right swipe -> next slide.
5. Left swipe -> previous slide.
6. Fist -> exit zoom mode.
7. OK sign -> enter zoom mode.
8. In zoom mode, move the hand to pan.
9. Keyboard fallback: ArrowRight/Space, ArrowLeft, Escape, Z.

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

The MediaPipe hand-landmarker model should be placed under `public/models/hand_landmarker.task`.
