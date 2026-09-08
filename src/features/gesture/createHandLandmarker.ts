import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import {
  HAND_LANDMARKER_MODEL_PATH,
  HAND_LANDMARKER_OPTIONS,
  MEDIAPIPE_WASM_PATH,
} from './handLandmarkerConfig'

function assetUrl(relativePath: string): string {
  return new URL(`${import.meta.env.BASE_URL}${relativePath}`, window.location.href).href
}

export async function assertHandLandmarkerModelExists(): Promise<string> {
  const modelUrl = assetUrl(HAND_LANDMARKER_MODEL_PATH)

  try {
    const head = await fetch(modelUrl, { method: 'HEAD' })
    const length = Number(head.headers.get('content-length') ?? 0)
    if (head.ok && length >= 1024) {
      return modelUrl
    }
  } catch {
    // Some hosts reject HEAD; fall through to GET.
  }

  let response: Response
  try {
    response = await fetch(modelUrl)
  } catch {
    throw new Error(
      `HandLandmarkerのモデルファイルを読み込めませんでした: ${modelUrl}。public/models/hand_landmarker.task を配置してください。`,
    )
  }

  if (response.status === 404 || !response.ok) {
    throw new Error(
      `HandLandmarkerのモデルファイルが見つかりません (HTTP ${response.status}): ${modelUrl}。public/models/hand_landmarker.task を配置してください。`,
    )
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength < 1024) {
    throw new Error(
      `HandLandmarkerのモデルファイルが不正です: ${modelUrl}。public/models/hand_landmarker.task を置き直してください。`,
    )
  }

  return modelUrl
}

export async function createHandLandmarker(modelUrl: string): Promise<HandLandmarker> {
  const wasmUrl = assetUrl(MEDIAPIPE_WASM_PATH).replace(/\/?$/, '/')
  let vision
  try {
    vision = await FilesetResolver.forVisionTasks(wasmUrl)
  } catch (error) {
    throw new Error(
      `MediaPipe WASMの初期化に失敗しました (${wasmUrl}): ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const shared = {
    runningMode: HAND_LANDMARKER_OPTIONS.runningMode,
    numHands: HAND_LANDMARKER_OPTIONS.numHands,
    minHandDetectionConfidence: HAND_LANDMARKER_OPTIONS.minHandDetectionConfidence,
    minHandPresenceConfidence: HAND_LANDMARKER_OPTIONS.minHandPresenceConfidence,
    minTrackingConfidence: HAND_LANDMARKER_OPTIONS.minTrackingConfidence,
  }

  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelUrl,
        delegate: 'GPU',
      },
      ...shared,
    })
  } catch {
    try {
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
          delegate: 'CPU',
        },
        ...shared,
      })
    } catch (error) {
      throw new Error(
        `HandLandmarkerの初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
