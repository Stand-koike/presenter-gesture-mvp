import { useCallback, useMemo, useState } from 'react'
import {
  type CooldownLevel,
  type GestureConfig,
  resolveGestureConfig,
  type SensitivityLevel,
} from './gestureConfig'

const STORAGE_KEY = 'presenter-gesture.settings.v1'

type StoredSettings = {
  gestureEnabled: boolean
  swipeSensitivity: SensitivityLevel
  cooldown: CooldownLevel
  debugMode: boolean
  pointerModeEnabled: boolean
}

const DEFAULT_STORED: StoredSettings = {
  gestureEnabled: true,
  swipeSensitivity: 'medium',
  cooldown: 'medium',
  debugMode: false,
  pointerModeEnabled: false,
}

function readStored(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STORED
    const parsed = JSON.parse(raw) as Partial<StoredSettings>
    return {
      gestureEnabled: parsed.gestureEnabled ?? DEFAULT_STORED.gestureEnabled,
      swipeSensitivity: parsed.swipeSensitivity ?? DEFAULT_STORED.swipeSensitivity,
      cooldown: parsed.cooldown ?? DEFAULT_STORED.cooldown,
      debugMode: parsed.debugMode ?? DEFAULT_STORED.debugMode,
      pointerModeEnabled: parsed.pointerModeEnabled ?? DEFAULT_STORED.pointerModeEnabled,
    }
  } catch {
    return DEFAULT_STORED
  }
}

function writeStored(next: StoredSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function useGestureSettings() {
  const [settings, setSettings] = useState<StoredSettings>(readStored)

  const patch = useCallback((partial: Partial<StoredSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...partial }
      writeStored(next)
      return next
    })
  }, [])

  const gestureConfig: GestureConfig = useMemo(
    () => resolveGestureConfig(settings.swipeSensitivity, settings.cooldown),
    [settings.swipeSensitivity, settings.cooldown],
  )

  return {
    gestureEnabled: settings.gestureEnabled,
    swipeSensitivity: settings.swipeSensitivity,
    cooldown: settings.cooldown,
    debugMode: settings.debugMode,
    pointerModeEnabled: settings.pointerModeEnabled,
    gestureConfig,
    setGestureEnabled: (gestureEnabled: boolean) => patch({ gestureEnabled }),
    setSwipeSensitivity: (swipeSensitivity: SensitivityLevel) => patch({ swipeSensitivity }),
    setCooldown: (cooldown: CooldownLevel) => patch({ cooldown }),
    setDebugMode: (debugMode: boolean) => patch({ debugMode }),
    setPointerModeEnabled: (pointerModeEnabled: boolean) => patch({ pointerModeEnabled }),
    toggleDebugMode: () => {
      setSettings((current) => {
        const next = { ...current, debugMode: !current.debugMode }
        writeStored(next)
        return next
      })
    },
  }
}
