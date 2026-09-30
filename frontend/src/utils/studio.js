import { getVideoId, load } from './video'
import { channelSubscriberCount } from './account'

export function listStudioVideos(catalog = []) {
  const local = load('yt-uploads', [])
  return [...local, ...catalog.filter((item) => item.uploaded || item.owner_id || String(item.id).startsWith('local-'))]
    .filter((item, index, list) => list.findIndex((entry) => getVideoId(entry) === getVideoId(item)) === index)
}

export function studioTotals(videos) {
  const views = videos.reduce((sum, item) => sum + (Number(item.views) || 0), 0)
  const likes = videos.reduce((sum, item) => sum + (Number(item.likes) || 0), 0)
  const seconds = videos.reduce((sum, item) => sum + (Number(item.duration_seconds) || 0) * Math.max(1, Number(item.views) || 0), 0)
  return { views, likes, watchHours: (seconds / 3600).toFixed(1), subscribers: channelSubscriberCount() }
}

export function loadCommunityPosts() {
  return load('yt-community-posts', [])
}

export function saveCommunityPosts(posts) {
  localStorage.setItem('yt-community-posts', JSON.stringify(posts))
  return posts
}

export function loadSubtitles() {
  return load('yt-subtitles', {})
}

export function saveSubtitle(videoId, text) {
  const next = { ...loadSubtitles(), [videoId]: text }
  localStorage.setItem('yt-subtitles', JSON.stringify(next))
  return next
}
