import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './App.css'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import VideoUpload from './components/VideoUpload'
import { API, CHIP_CATEGORY } from './config'
import { rawMocks } from './data/catalog'
import CategoryPage from './pages/CategoryPage'
import ChannelPage from './pages/ChannelPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import ShortsPage from './pages/ShortsPage'
import StudioShell from './pages/StudioShell'
import AccountHub from './pages/AccountHub'
import ChannelViewPage from './pages/ChannelViewPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import WatchPage from './pages/WatchPage'
import { HISTORY_PAUSED_KEY, isRestrictedVideo } from './utils/account'
import { getVideoId, load, matchesQuery, mergeCatalog, normalize } from './utils/video'

export default function App() {
  return <BrowserRouter><YouTubeApp /></BrowserRouter>
}

function YouTubeApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const contentRef = useRef(null)
  const [catalog, setCatalog] = useState(() => mergeCatalog(load('yt-uploads', []), rawMocks))
  const [shorts, setShorts] = useState([])
  const [query, setQuery] = useState('')
  const [liveResults, setLiveResults] = useState([])
  const [category, setCategory] = useState(() => load('yt-category', 'All'))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [likes, setLikes] = useState(() => load('yt-likes', []))
  const [dislikes, setDislikes] = useState(() => load('yt-dislikes', []))
  const [saved, setSaved] = useState(() => load('yt-saved', []))
  const [watchLater, setWatchLater] = useState(() => load('yt-later', []))
  const [subscriptions, setSubscriptions] = useState(() => load('yt-subs', []))
  const [history, setHistory] = useState(() => load('yt-history', []))
  const [downloads, setDownloads] = useState(() => load('yt-downloads', []))
  const [searchingLive, setSearchingLive] = useState(false)

  useEffect(() => {
    axios.get(`${API}/youtube/home`).then(({ data }) => {
      if (data?.length) setCatalog((current) => mergeCatalog(current, data.map((item) => normalize(item))))
    }).catch((error) => {
      if (error.response?.status === 503) return
    })
    axios.get(`${API}/videos`).then(({ data }) => {
      if (data?.length) setCatalog((current) => mergeCatalog(current, data.map((item) => normalize(item))))
    }).catch((error) => {
      if (error.response?.status !== 503) setLiveResults([])
    })
    axios.get(`${API}/youtube/home`, { timeout: 15000 }).then(({ data }) => {
      if (data?.length) setCatalog((current) => mergeCatalog(data.map((item) => normalize(item)), current))
    }).catch(() => {})
    axios.get(`${API}/youtube/shorts/feed`, { timeout: 20000 }).then(({ data }) => {
      if (data?.items?.length) setShorts(data.items.map((item) => normalize({ ...item, is_short: true })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function clearHistory() {
      setHistory([])
    }
    function openUpload() {
      setUploadOpen(true)
    }
    function onKey(event) {
      const typing = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA'
      if (event.key === '/' && !typing) {
        event.preventDefault()
        document.getElementById('yt-search-input')?.focus()
      }
      if (event.key === '?' && event.shiftKey) navigate('/account/shortcuts')
      if (typing) return
      if (event.key === 'g') {
        window.ytChord = 'g'
        window.setTimeout(() => { window.ytChord = '' }, 800)
        return
      }
      if (window.ytChord !== 'g') return
      if (event.key === 'h') navigate('/')
      if (event.key === 's') navigate('/studio')
      if (event.key === 'c') navigate('/channel')
    }
    window.addEventListener('yt-history-clear', clearHistory)
    window.addEventListener('yt-open-upload', openUpload)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('yt-history-clear', clearHistory)
      window.removeEventListener('yt-open-upload', openUpload)
      window.removeEventListener('keydown', onKey)
    }
  }, [navigate])

  useEffect(() => {
    [['yt-category', category], ['yt-likes', likes], ['yt-dislikes', dislikes], ['yt-saved', saved], ['yt-later', watchLater], ['yt-subs', subscriptions], ['yt-history', history], ['yt-downloads', downloads]].forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)))
  }, [category, likes, dislikes, saved, watchLater, subscriptions, history, downloads])

  useEffect(() => {
    if (!query.trim()) {
      setLiveResults([])
      setSearchingLive(false)
      return undefined
    }
    setSearchingLive(true)
    const timer = setTimeout(() => {
      axios.get(`${API}/search`, { params: { q: query }, timeout: 12000 })
        .then(({ data }) => {
          const remote = (data || []).map((item) => normalize(item))
          const localHits = catalog.filter((item) => matchesQuery(item, query))
          setLiveResults(mergeCatalog(remote, localHits))
        })
        .catch(() => {
          setLiveResults(catalog.filter((item) => matchesQuery(item, query)))
        })
        .finally(() => setSearchingLive(false))
    }, 120)
    return () => clearTimeout(timer)
  }, [query])

  function toggle(setter, id) {
    setter((items) => items.includes(id) ? items.filter((item) => item !== id) : [id, ...items])
  }

  function react(id, kind) {
    const own = kind === 'like' ? setLikes : setDislikes
    const other = kind === 'like' ? setDislikes : setLikes
    toggle(own, id)
    other((items) => items.filter((item) => item !== id))
  }

  async function suggestions(value) {
    const compare = (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })
    const localVideos = catalog.filter((item) => matchesQuery(item, value)).sort((left, right) => compare(left.title, right.title)).slice(0, 6)
    try {
      const { data } = await axios.get(`${API}/search/suggestions`, { params: { q: value }, timeout: 4000 })
      const queries = (Array.isArray(data) ? data : []).filter(Boolean).sort(compare).slice(0, 10)
      return { queries: queries.length ? queries : [value], videos: localVideos }
    } catch {
      return { queries: [value], videos: localVideos }
    }
  }

  function applySearch(value) {
    setCategory('All')
    setQuery(value)
    if (location.pathname !== '/') navigate('/')
  }

  function selectChip(name) {
    setCategory(name)
    if (name === 'All') {
      setQuery('')
      navigate('/')
      return
    }
    setQuery('')
    navigate(`/category/${encodeURIComponent(name)}`)
  }

  function showSearchOnHome(video) {
    const item = normalize(video)
    setCategory('All')
    setQuery(item.title || '')
    setLiveResults((current) => mergeCatalog([item], current))
    setCatalog((current) => mergeCatalog([item], current))
    if (location.pathname !== '/') navigate('/')
  }

  const videos = useMemo(() => {
    const searching = Boolean(query.trim())
    if (searching) {
      const youtubeHits = liveResults.filter((item) => item.videoId || (item.video_url || '').includes('youtube.com/watch'))
      const localHits = catalog.filter((item) => matchesQuery(item, query))
      if (youtubeHits.length) return mergeCatalog(youtubeHits, localHits).filter((item) => !isRestrictedVideo(item))
      return (liveResults.length ? liveResults : localHits).filter((item) => !isRestrictedVideo(item))
    }
    const mapped = CHIP_CATEGORY[category] || category
    const feed = mapped === 'All' ? catalog : catalog.filter((item) => item.category === mapped || matchesQuery(item, category))
    return feed.filter((item) => !isRestrictedVideo(item))
  }, [catalog, category, liveResults, query])

  const related = useMemo(() => {
    if (!query.trim()) return []
    const seen = new Set(videos.map((item) => getVideoId(item)))
    const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 2)
    return catalog.filter((item) => {
      const id = getVideoId(item)
      if (!id || seen.has(id)) return false
      const hay = `${item.title} ${item.channel_name} ${item.category} ${item.description || ''}`.toLowerCase()
      return words.some((word) => hay.includes(word)) || matchesQuery(item, query)
    }).slice(0, 10)
  }, [catalog, query, videos])

  function open(video) {
    const item = normalize(video)
    const id = getVideoId(item)
    setCatalog((current) => mergeCatalog([item], current))
    if (localStorage.getItem(HISTORY_PAUSED_KEY) !== 'true') {
      setHistory((items) => [id, ...items.filter((entry) => entry !== id)].slice(0, 60))
    }
    navigate(`/watch/${id}`)
  }

  function handleDownloaded(video) {
    const id = getVideoId(video)
    setDownloads((items) => items.includes(id) ? items : [id, ...items])
  }

  function handleUploaded(video) {
    const item = normalize({ ...video, views: video.views || 0, uploaded: true })
    setCatalog((items) => mergeCatalog([item], items))
    const uploads = load('yt-uploads', [])
    localStorage.setItem('yt-uploads', JSON.stringify([item, ...uploads].slice(0, 20)))
  }

  const libraryProps = { catalog, likes, saved, watchLater, history, downloads, subscriptions, open, onDownloaded: handleDownloaded }
  const inStudio = location.pathname.startsWith('/studio')

  function handleStudioDelete(id) {
    setCatalog((items) => items.filter((item) => getVideoId(item) !== id))
  }

  return (
    <div className={`app-shell ${inStudio ? 'studio-mode' : ''}`}>
      {!inStudio && (
        <Navbar
          onMenuClick={() => setSidebarOpen((value) => !value)}
          onHome={() => { setQuery(''); setCategory('All'); navigate('/') }}
          onUploadClick={() => setUploadOpen(true)}
          onSearch={applySearch}
          onSearchSuggestions={suggestions}
          onPickVideo={showSearchOnHome}
        />
      )}
      <div className={inStudio ? 'studio-wrap' : `app-layout ${sidebarOpen ? 'guide-expanded' : 'guide-mini'}`}>
        {!inStudio && <Sidebar open={sidebarOpen} path={location.pathname} navigate={navigate} />}
        <main ref={contentRef} className={inStudio ? 'studio-root' : `content ${location.pathname.startsWith('/watch') ? 'content-watch' : ''} ${location.pathname === '/shorts' ? 'content-shorts' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage videos={videos} shorts={shorts} related={related} category={category} setCategory={selectChip} query={query} searchingLive={searchingLive} open={open} onDownloaded={handleDownloaded} subscriptions={subscriptions} onToggleSubscribe={(id) => toggle(setSubscriptions, id)} />} />
            <Route path="/watch/:id" element={<WatchPage catalog={catalog} setCatalog={setCatalog} likes={likes} dislikes={dislikes} saved={saved} later={watchLater} subscriptions={subscriptions} react={react} toggle={toggle} setSaved={setSaved} setLater={setWatchLater} setSubscriptions={setSubscriptions} setDownloads={setDownloads} open={open} />} />
            <Route path="/shorts" element={<ShortsPage catalog={shorts} likes={likes} dislikes={dislikes} react={react} />} />
            <Route path="/you" element={<LibraryPage page="you" {...libraryProps} />} />
            <Route path="/subscriptions" element={<SubscriptionsPage subscriptions={subscriptions} setSubscriptions={setSubscriptions} toggle={toggle} open={open} />} />
            <Route path="/history" element={<LibraryPage page="history" {...libraryProps} />} />
            <Route path="/watch-later" element={<LibraryPage page="watch-later" {...libraryProps} />} />
            <Route path="/liked" element={<LibraryPage page="liked" {...libraryProps} />} />
            <Route path="/channel/:ref" element={<ChannelViewPage open={open} subscriptions={subscriptions} onToggleSubscribe={(name) => toggle(setSubscriptions, name)} />} />
            <Route path="/channel" element={<ChannelPage catalog={catalog} open={open} onDownloaded={handleDownloaded} onUploadClick={() => setUploadOpen(true)} />} />
            <Route path="/studio/*" element={<StudioShell catalog={catalog} open={open} onUploadClick={() => setUploadOpen(true)} onDeleted={handleStudioDelete} />} />
            <Route path="/account/:section" element={<AccountHub />} />
            <Route path="/playlists" element={<LibraryPage page="playlists" {...libraryProps} />} />
            <Route path="/downloads" element={<LibraryPage page="downloads" {...libraryProps} />} />
            <Route path="/your-videos" element={<LibraryPage page="your-videos" {...libraryProps} />} />
            <Route path="/category/:name" element={<CategoryPage catalog={catalog} open={open} onDownloaded={handleDownloaded} setCategory={selectChip} />} />
            <Route path="/library/:page" element={<LibraryPage {...libraryProps} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {uploadOpen && <VideoUpload onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />}
    </div>
  )
}
