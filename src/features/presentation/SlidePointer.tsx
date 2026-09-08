type Props = {
  x: number
  y: number
}

export function SlidePointer({ x, y }: Props) {
  return (
    <div
      className="slide-pointer"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
      }}
      aria-hidden
    />
  )
}
