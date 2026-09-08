import type { CooldownLevel, SensitivityLevel } from './gestureConfig'
import { COOLDOWN_LABELS, SENSITIVITY_LABELS } from './gestureConfig'

type Props = {
  swipeSensitivity: SensitivityLevel
  cooldown: CooldownLevel
  debugMode: boolean
  pointerModeEnabled: boolean
  onSensitivityChange: (value: SensitivityLevel) => void
  onCooldownChange: (value: CooldownLevel) => void
  onDebugModeChange: (value: boolean) => void
  onPointerModeChange: (value: boolean) => void
}

export function GestureSettingsPanel({
  swipeSensitivity,
  cooldown,
  debugMode,
  pointerModeEnabled,
  onSensitivityChange,
  onCooldownChange,
  onDebugModeChange,
  onPointerModeChange,
}: Props) {
  return (
    <section className="gesture-settings" aria-label="Gesture settings">
      <label className="gesture-settings__row gesture-settings__check">
        <input
          type="checkbox"
          checked={pointerModeEnabled}
          onChange={(e) => onPointerModeChange(e.target.checked)}
        />
        <span>Pointer Mode (P)</span>
      </label>
      <label className="gesture-settings__row">
        <span>Swipe Sensitivity</span>
        <select
          value={swipeSensitivity}
          onChange={(e) => onSensitivityChange(e.target.value as SensitivityLevel)}
        >
          {(Object.keys(SENSITIVITY_LABELS) as SensitivityLevel[]).map((key) => (
            <option key={key} value={key}>{SENSITIVITY_LABELS[key]}</option>
          ))}
        </select>
      </label>
      <label className="gesture-settings__row">
        <span>Cooldown</span>
        <select
          value={cooldown}
          onChange={(e) => onCooldownChange(e.target.value as CooldownLevel)}
        >
          {(Object.keys(COOLDOWN_LABELS) as CooldownLevel[]).map((key) => (
            <option key={key} value={key}>{COOLDOWN_LABELS[key]}</option>
          ))}
        </select>
      </label>
      <label className="gesture-settings__row gesture-settings__check">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => onDebugModeChange(e.target.checked)}
        />
        <span>Debug Mode (D)</span>
      </label>
    </section>
  )
}
