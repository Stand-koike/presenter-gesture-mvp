type Props = {
  active: boolean
}

export function BlackScreenOverlay({ active }: Props) {
  if (!active) return null

  return <div className="black-screen" aria-hidden="true" />
}
