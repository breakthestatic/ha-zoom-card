/* Based on this http://jsfiddle.net/brettwp/J4djY/*/
export default function detectDoubleTapClosure(fn, tapSpeed = 500) {
  let lastTap = 0;
  let timeout;
  return function detectDoubleTap(event) {
    if (event.touches.length) return
    const curTime = new Date().getTime();
    const tapLen = curTime - lastTap;
    if (tapLen < tapSpeed && tapLen > 0) {
      event.preventDefault();
      fn()
    } else {
      timeout = setTimeout(() => {
        clearTimeout(timeout);
      }, tapSpeed);
    }
    lastTap = curTime;
  };
}

