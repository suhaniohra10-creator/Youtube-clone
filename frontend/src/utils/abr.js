export const QUALITY_LADDER = [
  { id: 'hd1080', label: '1080p', height: 1080, minKbps: 4000 },
  { id: 'hd720', label: '720p', height: 720, minKbps: 2200 },
  { id: 'large', label: '480p', height: 480, minKbps: 900 },
  { id: 'medium', label: '360p', height: 360, minKbps: 400 },
]

export function qualityLabel(id) {
  return QUALITY_LADDER.find((item) => item.id === id)?.label || 'Auto'
}

export function qualityHeight(id) {
  return QUALITY_LADDER.find((item) => item.id === id)?.height || 720
}

export function networkKbps() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!connection) return 0
  if (connection.saveData) return 400
  if (Number(connection.downlink) > 0) return Number(connection.downlink) * 1000
  const type = connection.effectiveType
  if (type === 'slow-2g' || type === '2g') return 250
  if (type === '3g') return 800
  if (type === '4g') return 5000
  return 0
}

export function bufferSeconds(node) {
  if (!node?.buffered?.length || !Number.isFinite(node.currentTime)) return 0
  for (let index = 0; index < node.buffered.length; index += 1) {
    const start = node.buffered.start(index)
    const end = node.buffered.end(index)
    if (node.currentTime >= start && node.currentTime <= end) return end - node.currentTime
  }
  return 0
}

export function initialAutoQuality() {
  const kbps = networkKbps()
  if (!kbps) return 'hd720'
  return QUALITY_LADDER.find((item) => kbps >= item.minKbps)?.id || 'medium'
}

export function chooseQuality({ locked, kbps, bufferSec, waiting, currentId }) {
  if (locked && locked !== 'auto') return locked
  const ladder = QUALITY_LADDER
  let index = Math.max(0, ladder.findIndex((item) => item.id === currentId))
  if (waiting || bufferSec < 1.25) index = Math.min(index + 1, ladder.length - 1)
  else if (bufferSec > 8) index = Math.max(index - 1, 0)
  while (index < ladder.length - 1 && kbps > 0 && kbps < ladder[index].minKbps) index += 1
  return ladder[index].id
}

export function youtubeQuality(id) {
  return id === 'auto' ? 'default' : id
}

export function renditionHeights(video) {
  const rows = video?.renditions || []
  return rows.map((item) => Number(item.height || item.id)).filter((height) => height > 0).sort((left, right) => right - left)
}

export function streamWithQuality(base, qualityId, video) {
  if (!base) return ''
  const heights = renditionHeights(video)
  if (!heights.length || qualityId === 'hd1080') return base
  const wanted = qualityHeight(qualityId)
  const picked = heights.find((height) => height <= wanted) || heights[heights.length - 1]
  const source = heights[0]
  if (!picked || picked >= source) return base
  try {
    const url = new URL(base, window.location.origin)
    url.searchParams.set('quality', String(picked))
    return url.toString()
  } catch {
    return `${base}${base.includes('?') ? '&' : '?'}quality=${picked}`
  }
}
