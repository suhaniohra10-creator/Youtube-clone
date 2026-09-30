import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import ChipSlider from '../components/ChipSlider'
import SearchChannelCard from '../components/SearchChannelCard'
import SearchResultRow from '../components/SearchResultRow'
import ShortsShelf from '../components/ShortsShelf'
import VideoCard from '../components/VideoCard'
import { API, HOME_CHIPS } from '../config'
import { useI18n } from '../i18n'
import { channelPath } from '../utils/channelLink'
import { getVideoId } from '../utils/video'

// Only show a channel card when the real result actually corresponds to what was typed
function channelMatches(term, channel) {
  const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const q = norm(term.replace(/(channel|official|videos?)/gi, ''))
  if (!q || !channel?.name) return false
  return norm(channel.name).includes(q) || norm(channel.handle).includes(q) || q.includes(norm(channel.name))
}

const SEARCH_FILTER_CHIPS = ['All', 'Shorts', 'Unwatched', 'Watched', 'Videos', 'Recently uploaded', 'Live']

function HomePage({
  videos,
  shorts = [],
  related = [],
  category,
  setCategory,
  query,
  searchingLive,
  open,
  onDownloaded,
  subscriptions = [],
  onToggleSubscribe,
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchFilter, setSearchFilter] = useState('All')
  const searching = Boolean(query.trim())
  // Number of videos displayed, increase as scrolling
  const [displayedCount, setDisplayedCount] = useState(30) // 10 rows * 3 per row
  const sentinelRef = useRef(null)

  // Observe sentinel to load more videos
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setDisplayedCount((prev) => prev + 12)
      }
    }, { root: null, rootMargin: '200px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [videos.length])

  // Real channel profile from the backend (YouTube Data API, refreshed on every search / reload)
  const [liveChannel, setLiveChannel] = useState(null)
  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setLiveChannel(null)
      return undefined
    }
    let stale = false
    const timer = setTimeout(() => {
      axios.get(`${API}/youtube/channel`, { params: { q: term }, timeout: 12000 })
        .then(({ data }) => { if (!stale) setLiveChannel(channelMatches(term, data) ? data : null) })
        .catch(() => { if (!stale) setLiveChannel(null) })
    }, 250)
    return () => { stale = true; clearTimeout(timer) }
  }, [query])
  const matchedChannel = searching ? liveChannel : null

  function handleOpenChannel(channel) {
    navigate(channelPath(channel))
  }

  function handleOpenShort(_short) {
    navigate('/shorts')
  }

  // Filter videos if user clicked e.g. "Shorts" or "Live" or other search filter chip
  const displayVideos = searching && searchFilter !== 'All'
    ? videos.filter((v) => {
        if (searchFilter === 'Shorts') return v.is_short || v.duration_seconds <= 60
        if (searchFilter === 'Videos') return !v.is_short && v.duration_seconds > 60
        if (searchFilter === 'Live') return v.is_live || v.category === 'Live'
        return true
      })
    : videos

  // Split videos: first row of 3, then shorts shelf, then the rest
  // Endless feed: once the catalog is exhausted it loops with fresh keys so scrolling never dead-ends
  const displayedVideos = !searching && videos.length
    ? Array.from({ length: displayedCount }, (_, index) => {
        const round = Math.floor(index / videos.length)
        const item = videos[index % videos.length]
        return round ? { ...item, feedKey: `${getVideoId(item)}-r${round}` } : item
      })
    : []
  const firstRowVideos = displayedVideos.slice(0, 3)
  const remainingVideos = displayedVideos.slice(3)

  return (
    <>
      {searching ? (
        <div className="search-filter-row">
          <div className="search-filter-chips">
            {SEARCH_FILTER_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`search-chip ${searchFilter === chip ? 'active' : ''}`}
                onClick={() => setSearchFilter(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
          <button type="button" className="search-filters-btn" aria-label="Filters">
            <span>Filters</span>
            <SlidersHorizontal size={16} />
          </button>
        </div>
      ) : (
        <ChipSlider items={HOME_CHIPS} active={category} onSelect={setCategory} />
      )}

      {/* Show Real YouTube-Style Channel Header when searching for a channel */}
      {searching && matchedChannel && (
        <SearchChannelCard
          channel={matchedChannel}
          subscriptions={subscriptions}
          onToggleSubscribe={onToggleSubscribe}
          onOpenChannel={handleOpenChannel}
        />
      )}

      {searching && !matchedChannel && !searchingLive && !videos.length && (
        <div className="search-banner">
          <h2>{t('resultsFor')} “{query}”</h2>
          <p>{t('matchingStay')}</p>
        </div>
      )}

      {searching && searchingLive && !displayVideos.length && (
        <div className="empty-state">
          <h2>{t('searching')}</h2>
          <p>{t('loadingFor')} “{query}”.</p>
        </div>
      )}

      {searching && displayVideos.length > 0 && (
        <div className="search-result-list">
          {displayVideos.map((video) => (
            <SearchResultRow key={getVideoId(video)} video={video} onOpen={open} />
          ))}
        </div>
      )}

      {searching && related.length > 0 && (
        <section className="related-block">
          <h3>{t('related')}</h3>
          <div className="video-grid">
            {related.map((video) => (
              <VideoCard key={getVideoId(video)} video={video} onOpen={open} onDownloaded={onDownloaded} />
            ))}
          </div>
        </section>
      )}

      {/* Homepage Grid with 3 videos per row & 5 Shorts shelf dynamically placed between rows */}
      {!searching && videos.length > 0 && (
        <div className="home-feed-layout">
          {/* First row of 3 videos */}
          {firstRowVideos.length > 0 && (
            <div className="video-grid">
              {firstRowVideos.map((video) => (
                <VideoCard key={getVideoId(video)} video={video} onOpen={open} onDownloaded={onDownloaded} />
              ))}
            </div>
          )}

          {/* 5-item Shorts Shelf between video rows */}
          {shorts.length > 0 && (
            <ShortsShelf shorts={shorts} onOpenShort={handleOpenShort} />
          )}

          {/* Remaining rows of videos (3 per row) */}
          {remainingVideos.length > 0 && (
            <div className="video-grid">
              {remainingVideos.map((video) => (
                <VideoCard key={video.feedKey || getVideoId(video)} video={video} onOpen={open} onDownloaded={onDownloaded} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} />
        </div>
      )}

      {!searchingLive && searching && !displayVideos.length && !related.length && !matchedChannel && (
        <div className="empty-state">
          <h2>{t('noVideos')}</h2>
          <p>{t('tryDifferentFor')} “{query}”.</p>
        </div>
      )}

      {!searching && !videos.length && (
        <div className="empty-state">
          <h2>{t('noVideos')}</h2>
          <p>{t('tryDifferent')}</p>
        </div>
      )}
    </>
  )
}

export default HomePage
