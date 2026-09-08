export function installUint8ArrayHexPolyfill() {
  const proto = Uint8Array.prototype as Uint8Array & { toHex?: () => string }
  if (typeof proto.toHex === 'function') return

  Object.defineProperty(proto, 'toHex', {
    configurable: true,
    writable: true,
    value: function toHex(this: Uint8Array) {
      let hex = ''
      for (let i = 0; i < this.length; i += 1) {
        hex += this[i].toString(16).padStart(2, '0')
      }
      return hex
    },
  })
}

installUint8ArrayHexPolyfill()
