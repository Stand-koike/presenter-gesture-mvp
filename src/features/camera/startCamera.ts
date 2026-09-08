export type CameraFailure = {
  message: string
  cause: 'permission_denied' | 'not_found' | 'unsupported' | 'failed'
}

export function toCameraFailure(error: unknown): CameraFailure {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      cause: 'permission_denied',
      message: 'カメラを利用できません（許可が拒否されました）',
    }
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      cause: 'not_found',
      message: 'カメラを利用できません（カメラが見つかりません）',
    }
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      cause: 'failed',
      message: 'カメラを利用できません（他のアプリが使用中の可能性があります）',
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      cause: 'unsupported',
      message: 'カメラを利用できません（この環境はカメラAPIに対応していません）',
    }
  }
  return {
    cause: 'failed',
    message: 'カメラを利用できません',
  }
}

export async function startCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' })
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  })
}
