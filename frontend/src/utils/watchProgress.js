import axios from 'axios'
import { API } from '../config'

/** localStorage key for guest resume: yt_progress_{videoId} */
export function progressKey(videoId) {
  return `yt_progress_${videoId}`
}

export function authHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function readLocalProgress(videoId) {
  const value = Number(localStorage.getItem(progressKey(videoId)))
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function writeLocalProgress(videoId, currentTime) {
  const time = Math.max(0, Number(currentTime) || 0)
  if (time <= 0) {
    localStorage.removeItem(progressKey(videoId))
    return 0
  }
  localStorage.setItem(progressKey(videoId), String(Math.round(time * 100) / 100))
  return time
}

export async function saveWatchProgress(videoId, currentTime) {
  const time = Math.max(0, Number(currentTime) || 0)
  // Skip the first seconds so a failed seek does not overwrite a real resume point.
  if (time > 0 && time < 2) return time
  writeLocalProgress(videoId, time)
  const headers = authHeaders()
  if (!headers.Authorization) return time
  try {
    await axios.post(`${API}/user/progress`, { videoId, currentTime: time }, { headers })
  } catch (error) {
    if (error.response?.status !== 401) writeLocalProgress(videoId, time)
  }
  return time
}

export async function loadResumeTime(videoId, serverTime = 0) {
  const query = Number(new URLSearchParams(window.location.search).get('t')) || 0
  if (query > 0) return query
  if (Number(serverTime) > 1) return Number(serverTime)
  const headers = authHeaders()
  if (headers.Authorization) {
    try {
      const { data } = await axios.get(`${API}/user/progress/${videoId}`, { headers })
      if (Number(data?.lastWatchedTime) > 1) return Number(data.lastWatchedTime)
    } catch (error) {
      if (error.response?.status && error.response.status !== 401 && error.response.status !== 404) {
        return readLocalProgress(videoId)
      }
    }
  }
  return readLocalProgress(videoId)
}
