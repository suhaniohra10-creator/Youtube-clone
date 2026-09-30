import { API, SAMPLE_PREVIEWS } from '../config'

const MONGO_ID = /^[a-f0-9]{24}$/i

export function getVideoId(video) {
  if (video?.id) return String(video.id)
  if (video?.videoId) return String(video.videoId)
  try {
    return new URL(video?.video_url || video?.videoUrl).searchParams.get('v')
  } catch {
    return null
  }
}

export function isMongoId(value) {
  return MONGO_ID.test(String(value || ''))
}

function apiOrigin(apiBase = API) {
  return String(apiBase || '').replace(/\/api\/?$/, '')
}

function isSamplePreview(url) {
  return String(url || '').includes('gtv-videos-bucket')
}

function isYouTubePage(url) {
  return /youtube\.com\/watch|youtu\.be\/|youtube-nocookie\.com/.test(String(url || ''))
}

export function isOwnUpload(video, id) {
  const vid = String(getVideoId(video) || id || '')
  return Boolean(video?.uploaded || video?.file_id || video?.fileId || vid.startsWith('local-'))
}

export function isFileStream(url) {
  const value = String(url || '')
  if (!value || isSamplePreview(value) || isYouTubePage(value)) return false
  return value.startsWith('blob:') || value.startsWith('data:') || value.includes('/stream') || value.includes('/api/videos/') || /\.(mp4|webm|mov|mkv|m4v)(\?|$)/i.test(value)
}

export function toAbsoluteMedia(path, apiBase = API) {
  const source = String(path || '')
  if (!source) return ''
  if (source.startsWith('blob:') || source.startsWith('data:') || source.startsWith('http://') || source.startsWith('https://')) return source
  if (source.startsWith('/api/') || source.startsWith('/')) return `${apiOrigin(apiBase)}${source}`
  return source
}

export function isNativeVideo(video, id) {
  const vid = String(getVideoId(video) || id || '')
  const url = String(video?.video_url || video?.videoUrl || video?.preview_url || '')
  if (vid.startsWith('local-') || url.startsWith('blob:') || url.startsWith('data:')) return true
  if (video?.uploaded || video?.file_id || video?.fileId) return true
  if (isFileStream(url)) return true
  if (!isMongoId(vid)) return false
  const ytId = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)?.[1] || ''
  return !(ytId && ytId !== vid && ytId.length === 11)
}

export function streamUrlFor(video, apiBase = API) {
  const fileId = video?.file_id || video?.fileId
  const id = getVideoId(video)
  const candidates = [video?.video_url, video?.videoUrl, video?.preview_url]
  const direct = candidates.find((item) => isFileStream(item) || String(item || '').startsWith('blob:') || String(item || '').startsWith('data:'))
  if (direct) return toAbsoluteMedia(direct, apiBase)
  if (fileId) return `${apiOrigin(apiBase)}/api/videos/${fileId}/stream`
  if (isNativeVideo(video, id) && id && !String(id).startsWith('local-')) {
    return `${apiOrigin(apiBase)}/api/videos/${id}/stream`
  }
  return ''
}

export function fallbackStreamUrl(video, failedSrc, apiBase = API) {
  const origin = apiOrigin(apiBase)
  const fileId = video?.file_id || video?.fileId
  const id = getVideoId(video)
  return [fileId && `${origin}/api/videos/${fileId}/stream`, id && `${origin}/api/videos/${id}/stream`]
    .filter((url) => url && url !== failedSrc)[0] || ''
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function durationSeconds(video) {
  if (Number.isFinite(Number(video?.duration_seconds)) && Number(video.duration_seconds) > 0) {
    return Number(video.duration_seconds)
  }
  const label = String(video?.duration || '')
  if (!label || label === 'LIVE') return 0
  const parts = label.split(':').map(Number)
  if (parts.some((part) => Number.isNaN(part))) return 0
  return parts.reduce((total, part) => total * 60 + part, 0)
}

export function durationLabel(video) {
  const seconds = durationSeconds(video)
  return seconds ? `${seconds}s` : video?.duration || '0s'
}

export function compact(value) {
  if (typeof value === 'string' && /[a-z]/i.test(value)) return value
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
}

export function relativeAge(value) {
  if (!value) return ''
  if (typeof value === 'string' && /(ago|just now|Recently|Today|Yesterday)/i.test(value) && Number.isNaN(Date.parse(value))) {
    return value
  }
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return typeof value === 'string' ? value : ''
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function mongoDate(id) {
  const value = String(id || '')
  if (!/^[a-f0-9]{24}$/i.test(value)) return ''
  const date = new Date(parseInt(value.slice(0, 8), 16) * 1000)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function isFrozenAge(value) {
  return typeof value === 'string' && /(ago|just now|Recently|Today|Yesterday)/i.test(value) && Number.isNaN(Date.parse(value))
}

export function uploadedAt(video) {
  const candidates = [video?.publishedAt, video?.createdAt, video?.created_at, video?.published_at]
  for (const value of candidates) {
    if (!value || isFrozenAge(value)) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return mongoDate(getVideoId(video))
}

export function displayAge(video) {
  const stamp = uploadedAt(video)
  if (stamp) return relativeAge(stamp)
  if (video?.age && !/^just now$/i.test(String(video.age).trim())) return video.age
  return ''
}

export function formatViews(views, viewsWord = 'views') {
  if (typeof views === 'string' && /[a-z]/i.test(views)) {
    return /view/i.test(views) ? views : `${views} ${viewsWord}`
  }
  const count = Number(views) || 0
  if (count <= 0) return `0 ${viewsWord}`
  const digits = count >= 1000000 ? 0 : 1
  const label = new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: digits }).format(count)
  return `${label.replace(/\.0$/, '')} ${viewsWord}`
}

export function load(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key))
    return stored ?? fallback
  } catch {
    return fallback
  }
}

export function previewUrlFor(video, index = 0) {
  const stream = streamUrlFor(video)
  if (stream) return stream
  const raw = video?.preview_url || video?.videoUrl || video?.video_url || ''
  if (isFileStream(raw) || String(raw).startsWith('blob:')) return toAbsoluteMedia(raw)
  if (video?.uploaded || video?.file_id || String(getVideoId(video) || '').startsWith('local-')) return stream
  return SAMPLE_PREVIEWS[index % SAMPLE_PREVIEWS.length]
}

export function resolveMediaUrl(video, apiBase = API) {
  return streamUrlFor(video, apiBase)
}

export function normalize(video, index = 0) {
  const id = getVideoId(video)
  const seconds = durationSeconds({
    ...video,
    duration_seconds: video.duration_seconds ?? (typeof video.duration === 'number' ? video.duration : undefined),
    duration: typeof video.duration === 'number' ? formatClock(video.duration) : video.duration,
  })
  const native = isNativeVideo(video, id)
  const stream = streamUrlFor({ ...video, id })
  const videoUrl = native ? (stream || video.video_url || video.videoUrl || '') : (video.video_url || video.videoUrl || (id ? `https://www.youtube.com/watch?v=${id}` : ''))
  const published = uploadedAt({ ...video, id }) || video.publishedAt || video.createdAt || video.created_at || ''
  const views = typeof video.views === 'string' && /[a-z]/i.test(video.views) ? video.views : Number(video.views) || 0
  const fileId = video.file_id || video.fileId || ''
  const item = {
    ...video,
    id,
    uploaded: Boolean(video.uploaded || fileId || String(id || '').startsWith('local-')),
    file_id: fileId || video.file_id,
    channel_name: video.channel_name || video.channelTitle || video.channel || 'YouTube creator',
    channel_id: video.channel_id || video.channelId || '',
    channelId: video.channel_id || video.channelId || '',
    thumbnail_url: video.thumbnail_url || video.thumbnailUrl || video.thumbnail || (!native && id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
    videoId: id,
    channel_avatar: video.channel_avatar || video.channelAvatar || '',
    video_url: videoUrl,
    videoUrl,
    preview_url: stream || video.preview_url || '',
    duration_seconds: seconds,
    duration: seconds ? formatClock(seconds) : (typeof video.duration === 'string' ? video.duration : '0:00'),
    views,
    likes: Number(video.likes) || 0,
    dislikes: Number(video.dislikes) || 0,
    subscribers: Number.isFinite(Number(video.subscribers)) ? Number(video.subscribers) : 0,
    channel_handle: video.channel_handle || video.customUrl || '',
    description: video.description || '',
    renditions: video.renditions || [],
    lastWatchedTime: Number(video.lastWatchedTime) || 0,
    publishedAt: published,
    createdAt: published,
    created_at: published || video.created_at,
    age: relativeAge(published) || (isFrozenAge(video.age) && !/^just now$/i.test(String(video.age || '').trim()) ? video.age : ''),
  }
  item.preview_url = previewUrlFor(item, index)
  if (native && item.preview_url && !isYouTubePage(item.video_url)) {
    item.video_url = item.preview_url
    item.videoUrl = item.preview_url
  }
  return item
}

export function mergeCatalog(...lists) {
  const seen = new Set()
  const merged = []
  lists.flat().forEach((video, index) => {
    const item = normalize(video, index)
    if (!item.id || seen.has(item.id)) return
    seen.add(item.id)
    merged.push(item)
  })
  return merged
}

export function matchesQuery(video, query) {
  const text = query.trim().toLowerCase()
  if (!text) return true
  return `${video.title} ${video.channel_name} ${video.description} ${video.category}`.toLowerCase().includes(text)
}

export function watchLink(video, startSeconds = 0) {
  const id = getVideoId(video)
  const base = `${window.location.origin}/watch/${id}`
  const start = Math.floor(Math.max(0, Number(startSeconds) || 0))
  return start ? `${base}?t=${start}` : base
}

export function safeFilename(title) {
  return `${String(title || 'video').replace(/[^\w\s-]+/g, '').trim() || 'video'}.mp4`
}

export async function copyWatchLink(video) {
  const url = watchLink(video)
  if (!navigator.clipboard?.writeText) throw new Error('Copy is not available')
  await navigator.clipboard.writeText(url)
  return url
}

export function rememberDownload(videoId) {
  const current = load('yt-downloads', [])
  if (current.includes(videoId)) return current
  const next = [videoId, ...current]
  localStorage.setItem('yt-downloads', JSON.stringify(next))
  return next
}

export async function downloadMedia(video, apiBase) {
  const source = resolveMediaUrl(video, apiBase)
  if (!source) throw new Error('No downloadable source')
  if (source.startsWith('blob:')) {
    const link = document.createElement('a')
    link.href = source
    link.download = safeFilename(video.title)
    link.click()
    return
  }
  try {
    const response = await fetch(source)
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = safeFilename(video.title)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
  } catch {
    const link = document.createElement('a')
    link.href = source
    link.download = safeFilename(video.title)
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}
