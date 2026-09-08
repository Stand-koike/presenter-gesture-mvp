import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models', 'hand_landmarker.task')
const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

mkdirSync(dirname(dest), { recursive: true })
process.stdout.write(`Downloading HandLandmarker model to ${dest}\n`)

const response = await fetch(url)
if (!response.ok) {
  throw new Error(`Failed to download model: HTTP ${response.status}`)
}

const buffer = Buffer.from(await response.arrayBuffer())
const { writeFileSync } = await import('node:fs')
writeFileSync(dest, buffer)
process.stdout.write(`Saved ${buffer.byteLength} bytes\n`)
