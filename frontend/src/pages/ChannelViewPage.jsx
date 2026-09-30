import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import VideoCard from '../components/VideoCard'
import { API } from '../config'
import { normalize } from '../utils/video'

const TABS = ['Home', 'Videos', 'Shorts']

function VerifiedTick() {
  return (
    <svg className="ch-tick" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.8-7.8 1.4 1.4-9.2 9.2z" />
    </svg>
  )
}

function ChannelViewPage({ open, subscriptions = [], onToggleSubscribe }) {
  const { ref } = useParams()
  const navigate = useNavigate()
  const [channel, setChannel] = useState(null)
  const [tab, setTab] = useState('Home')
  const [videos, setVideos] = useState([])
  const [shorts, setShorts] = useState([])
  const [state, setState] = useState('loading')
  const [more, setMore] = useState(false)

  // Fresh data on every visit / reload
  useEffect(() => {
    let stale = false
    setState('loading')
    setChannel(null)
    setVideos([])
    setShorts([])
    setTab('Home')
    const base = `${API}/youtube/channels/${encodeURIComponent(ref)}`
    axios.get(base, { timeout: 20000 }).then(({ data }) => {
      if (stale) return
      setChannel(data)
      setState('ready')
      axios.get(`${base}/videos`, { params: { tab: 'videos' }, timeout: 20000 })
        .then((res) => { if (!stale) setVideos(res.data.map((item) => normalize(item))) }).catch(() => {})
      axios.get(`${base}/videos`, { params: { tab: 'shorts' }, timeout: 20000 })
        .then((res) => { if (!stale) setShorts(res.data.map((item) => normalize({ ...item, is_short: true }))) }).catch(() => {})
    }).catch(() => { if (!stale) setState('error') })
    return () => { stale = true }
  }, [ref])

  if (state === 'loading') return <div className="ch-status">Loading channel…</div>
  if (state === 'error' || !channel) return <div className="ch-status">This channel could not be loaded.</div>

  const subscribed = subscriptions.includes(channel.name) || subscriptions.includes(channel.id)
  const videoCount = channel.video_count ? `${channel.video_count.toLocaleString()} videos` : channel.video_count_label
  const description = channel.description || ''

  return (
    <section className="ch-page">
      {channel.banner && <div className="ch-banner"><img src={channel.banner} alt="" /></div>}
      <header className="ch-head">
        {channel.avatar ? <img className="ch-avatar" src={channel.avatar} alt="" /> : <span className="ch-avatar ch-avatar-fallback">{channel.name[0]}</span>}
        <div className="ch-info">
          <h1>{channel.name}{channel.verified && <VerifiedTick />}</h1>
          <p className="ch-meta">
            {[channel.handle, channel.subscribers, videoCount].filter(Boolean).join(' • ')}
          </p>
          {description && (
            <p className="ch-desc">
              {more ? description : description.split('\n')[0].slice(0, 140)}
              {(description.length > 140 || description.includes('\n')) && (
                <button type="button" className="ch-more" onClick={() => setMore((value) => !value)}>{more ? ' Show less' : ' ...more'}</button>
              )}
            </p>
          )}
          <button type="button" className={`subscribe ${subscribed ? 'subscribed' : ''}`} onClick={() => onToggleSubscribe?.(channel.name)}>
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>
      </header>
      <nav className="ch-tabs">
        {TABS.map((name) => (
          <button key={name} type="button" className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>
        ))}
      </nav>

      {(tab === 'Home' || tab === 'Videos') && (
        <>
          {tab === 'Home' && <h2 className="ch-h2">Latest videos</h2>}
          {videos.length ? (
            <div className="video-grid">
              {(tab === 'Home' ? videos.slice(0, 6) : videos).map((video) => <VideoCard key={video.id} video={video} onOpen={open} />)}
            </div>
          ) : <p className="ch-empty">No videos to show.</p>}
        </>
      )}
      {(tab === 'Home' || tab === 'Shorts') && shorts.length > 0 && (
        <>
          <h2 className="ch-h2">Shorts</h2>
          <div className="ch-shorts">
            {(tab === 'Home' ? shorts.slice(0, 6) : shorts).map((short) => (
              <button key={short.id} type="button" className="ch-short" onClick={() => navigate('/shorts')}>
                <img src={short.thumbnail_url} alt="" loading="lazy" />
                <b>{short.title}</b>
                <small>{short.views}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {tab === 'Shorts' && !shorts.length && <p className="ch-empty">No Shorts to show.</p>}
    </section>
  )
}

export default ChannelViewPage
