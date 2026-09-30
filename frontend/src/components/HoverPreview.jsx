import { useCallback, useEffect, useRef, useState } from 'react'
import { previewUrlFor } from '../utils/video'

export function useHoverPreview(delay = 350) {
  const [active, setActive] = useState(false)
  const timer = useRef(0)
  const enter = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setActive(true), delay)
  }, [delay])
  const leave = useCallback(() => {
    window.clearTimeout(timer.current)
    setActive(false)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { active, bind: { onMouseEnter: enter, onMouseLeave: leave, onFocus: enter, onBlur: leave }, stop: leave }
}

/* Plays from the start while active; hides itself when the clip ends or the cursor leaves. */
export function PreviewVideo({ video, active, onEnded }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const src = active ? previewUrlFor(video) : ''

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (active && src) {
      node.currentTime = 0
      node.play().catch(() => {})
    } else {
      node.pause()
      setReady(false)
    }
  }, [active, src])

  return (
    <video
      ref={ref}
      className={`hover-preview ${active && ready ? 'visible' : ''}`}
      src={src || undefined}
      muted
      playsInline
      preload="none"
      onPlaying={() => setReady(true)}
      onEnded={() => { setReady(false); onEnded?.() }}
    />
  )
}
