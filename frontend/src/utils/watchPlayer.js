import { getVideoId, isNativeVideo } from './video'
import { loadSubtitles } from './studio'

export { isNativeVideo }

export function clockToSec(value) {
  const parts = String(value || '0').split(':').map(Number)
  if (parts.some((part) => Number.isNaN(part))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

function vttTime(value) {
  const [hms, fraction = '0'] = String(value).trim().split('.')
  return clockToSec(hms) + Number(`0.${fraction}`)
}

export function parseCaptionCues(text) {
  const raw = String(text || '').trim()
  if (!raw) return []
  if (raw.includes('-->')) {
    return raw.split(/\n\n+/).map((block) => {
      const lines = block.split('\n').filter((line) => line && !/^\d+$/.test(line) && !line.startsWith('WEBVTT'))
      const stamp = lines.find((line) => line.includes('-->'))
      if (!stamp) return null
      const [start, end] = stamp.split('-->').map((part) => vttTime(part))
      return { start, end, text: lines.filter((line) => line !== stamp).join(' ') }
    }).filter(Boolean)
  }
  const rows = raw.split('\n').map((line) => {
    const match = line.match(/^((?:\d+:)?\d{1,2}:\d{2})\s+(.+)$/)
    return match ? { start: clockToSec(match[1]), text: match[2] } : null
  }).filter(Boolean)
  return rows.map((row, index) => ({ ...row, end: rows[index + 1]?.start || row.start + 4 }))
}

export function cueAt(cues, time) {
  return cues.find((cue) => time >= cue.start && time < cue.end)?.text || ''
}

export function captionsFor(videoId) {
  return parseCaptionCues(loadSubtitles()[videoId] || '')
}

let apiWaiter

export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiWaiter) {
    apiWaiter = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT)
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.dataset.ytIframeApi = 'true'
      tag.onerror = () => reject(new Error('Player API failed to load'))
      document.head.appendChild(tag)
    })
  }
  return apiWaiter
}
