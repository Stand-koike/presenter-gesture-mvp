import { cpSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const dest = path.join(root, 'public', 'mediapipe', 'wasm')

if (!existsSync(src)) {
  console.warn(`MediaPipe wasm not found: ${src}`)
  process.exit(0)
}

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
