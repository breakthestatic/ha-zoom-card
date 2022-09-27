/* Based on this http://jsfiddle.net/brettwp/J4djY/*/
export function doubleTap(fn, tapTimeout = 300) {
  let lastTapTimestamp = 0
  let timeout

  return function detectDoubleTap(event) {
    // Skip multi-touch
    if (event.touches.length) return

    const currentTimestamp = Date.now()
    const tapTimeDelta = currentTimestamp - lastTapTimestamp
    if (tapTimeDelta < tapTimeout && tapTimeDelta > 0) {
      event.preventDefault()
      fn()
    } else {
      timeout = setTimeout(() => {
        clearTimeout(timeout)
      }, tapTimeout)
    }
    lastTapTimestamp = currentTimestamp
  }
}
