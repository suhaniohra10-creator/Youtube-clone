import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import VideoCard from '../components/VideoCard'
import { API } from '../config'
import { useI18n } from '../i18n'
import { getVideoId, normalize } from '../utils/video'

const TITLE_KEYS = {
  you: 'you',
  channel: 'yourChannel',
  history: 'history',
  playlists: 'playlists',
  'watch-later': 'watchLater',
  liked: 'likedVideos',
  videos: 'yourVideos',
  'your-videos': 'yourVideos',
  downloads: 'downloads',
  subscriptions: 'subscriptions',
  premium: 'premium',
  music: 'musicPremium',
  kids: 'YouTube Kids',
}

const SAVED_PAGES = { liked: 'likes', playlists: 'saved', 'watch-later': 'watchLater', you: 'history', history: 'history', downloads: 'downloads' }

// Real, refreshed metadata for saved YouTube ids (views, titles, channel, age) via the backend
function useLiveVideos(ids) {
  const key = ids.filter((id) => /^[\w-]{11}$/.test(String(id))).slice(0, 50).join(',')
  const [live, setLive] = useState({})
  const [state, setState] = useState(key ? 'loading' : 'ready')
  useEffect(() => {
    if (!key) { setState('ready'); return undefined }
    let stale = false
    setState('loading')
    axios.get(`${API}/youtube/videos-by-ids`, { params: { ids: key }, timeout: 20000 })
      .then(({ data }) => {
        if (stale) return
        setLive(Object.fromEntries(data.map((item) => [item.id, normalize(item)])))
        setState('ready')
      })
      .catch(() => { if (!stale) setState('error') })
    return () => { stale = true }
  }, [key])
  return { live, state }
}

function selectVideos(page, catalog, collections) {
  const { likes, saved, watchLater, history, downloads, subscriptions } = collections
  const byId = (ids) => ids.map((id) => catalog.find((video) => getVideoId(video) === id)).filter(Boolean)
  if (page === 'liked') return byId(likes)
  if (page === 'playlists') return byId(saved)
  if (page === 'watch-later') return byId(watchLater)
  if (page === 'you' || page === 'history') return byId(history)
  if (page === 'downloads') return byId(downloads)
  if (page === 'subscriptions') return catalog.filter((video) => subscriptions.includes(video.channel_name))
  if (page === 'gaming') return catalog.filter((video) => video.category === 'Gaming')
  if (page === 'music') return catalog.filter((video) => video.category === 'Music')
  if (page === 'movies') return catalog.filter((video) => video.category === 'Movies')
  if (page === 'videos' || page === 'your-videos') return catalog.filter((video) => video.uploaded || String(video.id).startsWith('local-') || video.owner_id)
  if (['premium', 'kids', 'channel', 'trending'].includes(page)) return catalog
  return catalog
}

function LibraryPage({ page: pageProp, catalog, likes, saved, watchLater, history, downloads, subscriptions, open, onDownloaded }) {
  const { t } = useI18n()
  const { page: pageParam } = useParams()
  const page = pageProp || pageParam
  const collections = { likes, saved, watchLater, history, downloads, subscriptions }
  const savedIds = collections[SAVED_PAGES[page]] || []
  const { live, state } = useLiveVideos(savedIds)
  const base = selectVideos(page, catalog, collections)
  const selected = useMemo(() => {
    if (!SAVED_PAGES[page]) return base
    // prefer fresh API data; fall back to the locally-known copy (uploads, offline)
    return savedIds.map((id) => live[id] || catalog.find((video) => getVideoId(video) === id)).filter(Boolean)
  }, [page, base, savedIds, live, catalog])
  const title = t(TITLE_KEYS[page] || 'downloads')

  return (
    <section className="library-page">
      {page === 'channel' && (
        <div className="channel-hero">
          <span className="channel-avatar large">Y</span>
          <div>
            <h1>{t('yourChannel')}</h1>
            <p>@you · {selected.length} {t('videos')}</p>
          </div>
        </div>
      )}
      {page !== 'channel' && <h1>{title}</h1>}
      {!selected.length && state === 'loading' ? (
        <div className="empty-state"><h2>Loading…</h2></div>
      ) : !selected.length && state === 'error' ? (
        <div className="empty-state"><h2>Could not load your videos</h2><p>Check your connection and reload the page.</p></div>
      ) : selected.length ? (
        <div className="video-grid">
          {selected.map((video) => <VideoCard key={getVideoId(video)} video={video} onOpen={open} onDownloaded={onDownloaded} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t('nothingHere')}</h2>
          <p>{t('libraryEmpty')}</p>
        </div>
      )}
    </section>
  )
}

export default LibraryPage
