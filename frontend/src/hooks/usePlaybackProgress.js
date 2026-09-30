import { useEffect, useRef } from 'react'
import { saveWatchProgress } from '../utils/watchProgress'

/**
 * Syncs playback position every 5s while playing, and exposes pause/end helpers.
 */
export function usePlaybackProgress({ videoId, getTime, playing }) {
  const getTimeRef = useRef(getTime)
  const endedRef = useRef(false)
  getTimeRef.current = getTime

  useEffect(() => {
    endedRef.current = false
  }, [videoId])

  useEffect(() => {
    if (!videoId) return undefined
    const timer = window.setInterval(() => {
      if (!playing || endedRef.current) return
      saveWatchProgress(videoId, Number(getTimeRef.current?.()) || 0)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [videoId, playing])

  function syncNow() {
    if (!videoId || endedRef.current) return
    saveWatchProgress(videoId, Number(getTimeRef.current?.()) || 0)
  }

  function reset() {
    endedRef.current = true
    if (!videoId) return
    saveWatchProgress(videoId, 0)
  }

  return { syncNow, reset }
}
