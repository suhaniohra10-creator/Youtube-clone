import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { X } from 'lucide-react'
import VideoCard from '../components/VideoCard'
import { API } from '../config'
import { channelPath } from '../utils/channelLink'
import { normalize } from '../utils/video'

// Topics used as search queries against the real YouTube channel search (no channel data is hardcoded)
const TOPICS = [
  { id: 'music', title: 'Music', query: 'music' },
  { id: 'tech', title: 'Technology', query: 'technology reviews' },
  { id: 'comedy', title: 'Comedy', query: 'comedy' },
  { id: 'gaming', title: 'Gaming', query: 'gaming' },
  { id: 'news', title: 'News', query: 'news' },
]

function SubscriptionsPage({ subscriptions, setSubscriptions, toggle, open }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const fromChannel = params.get('from')
  const [hidden, setHidden] = useState([])
  const [expanded, setExpanded] = useState({})
  const [mine, setMine] = useState({ state: 'idle', channels: [], videos: [] })
  const [topics, setTopics] = useState({})

  useEffect(() => {
    if (fromChannel && !subscriptions.includes(fromChannel)) toggle(setSubscriptions, fromChannel)
  }, [fromChannel])

  // Real profiles + latest uploads for the channels you subscribed to (refreshed on each visit)
  const subKey = subscriptions.join('|')
  useEffect(() => {
    if (!subscriptions.length) {
      setMine({ state: 'ready', channels: [], videos: [] })
      return undefined
    }
    let stale = false
    setMine((current) => ({ ...current, state: 'loading' }))
    Promise.all(subscriptions.slice(0, 12).map((name) => (
      axios.get(`${API}/youtube/channels/${encodeURIComponent(name)}`, { timeout: 20000 })
        .then(({ data }) => data).catch(() => null)
    ))).then(async (channels) => {
      const found = channels.filter(Boolean)
      const lists = await Promise.all(found.slice(0, 6).map((channel) => (
        axios.get(`${API}/youtube/channels/${channel.id}/videos`, { params: { tab: 'videos' }, timeout: 20000 })
          .then(({ data }) => data.slice(0, 4)).catch(() => [])
      )))
      if (stale) return
      setMine({ state: 'ready', channels: found, videos: lists.flat().map((item) => normalize(item)) })
    }).catch(() => { if (!stale) setMine({ state: 'error', channels: [], videos: [] }) })
    return () => { stale = true }
  }, [subKey])

  // Real channels to discover, one search per topic
  useEffect(() => {
    let stale = false
    TOPICS.forEach((topic) => {
      setTopics((current) => ({ ...current, [topic.id]: { state: 'loading', channels: [] } }))
      axios.get(`${API}/youtube/channels-search`, { params: { q: topic.query, max_results: 10 }, timeout: 20000 })
        .then(({ data }) => { if (!stale) setTopics((current) => ({ ...current, [topic.id]: { state: 'ready', channels: data } })) })
        .catch(() => { if (!stale) setTopics((current) => ({ ...current, [topic.id]: { state: 'error', channels: [] } })) })
    })
    return () => { stale = true }
  }, [])

  function ChannelCard({ channel }) {
    const subscribed = subscriptions.includes(channel.name)
    return (
      <article className="channel-card">
        <img src={channel.avatar} alt="" style={{ cursor: 'pointer' }} onClick={() => navigate(channelPath({ channel_id: channel.id }))} />
        <h3 style={{ cursor: 'pointer' }} onClick={() => navigate(channelPath({ channel_id: channel.id }))}>{channel.name}</h3>
        <p>{channel.subscribers}</p>
        <button className={`subscribe-pill ${subscribed ? 'subscribed' : ''}`} type="button" onClick={() => toggle(setSubscriptions, channel.name)}>
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </button>
      </article>
    )
  }

  return (
    <section className="subscriptions-page">
      {subscriptions.length > 0 && (
        <div className="channel-section">
          <header><h2>Your subscriptions</h2></header>
          {mine.state === 'loading' && !mine.channels.length && <p className="ch-empty">Loading your subscriptions…</p>}
          {mine.state === 'error' && <p className="ch-empty">Could not load your subscriptions. Reload to try again.</p>}
          <div className="channel-grid">
            {mine.channels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}
          </div>
          {mine.videos.length > 0 && (
            <>
              <h2 className="ch-h2">Latest from your subscriptions</h2>
              <div className="video-grid">
                {mine.videos.map((video) => <VideoCard key={video.id} video={video} onOpen={open} />)}
              </div>
            </>
          )}
        </div>
      )}
      {TOPICS.filter((topic) => !hidden.includes(topic.id)).map((topic) => {
        const entry = topics[topic.id] || { state: 'loading', channels: [] }
        const visible = expanded[topic.id] ? entry.channels : entry.channels.slice(0, 5)
        if (entry.state === 'error' || (entry.state === 'ready' && !entry.channels.length)) return null
        return (
          <div className="channel-section" key={topic.id}>
            <header>
              <h2>{topic.title}</h2>
              <button className="icon-button" type="button" aria-label={`Hide ${topic.title}`} onClick={() => setHidden((items) => [...items, topic.id])}>
                <X size={18} />
              </button>
            </header>
            {entry.state === 'loading' && <p className="ch-empty">Loading…</p>}
            <div className="channel-grid">
              {visible.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}
            </div>
            {entry.channels.length > 5 && !expanded[topic.id] && (
              <button className="show-more" type="button" onClick={() => setExpanded((current) => ({ ...current, [topic.id]: true }))}>Show more</button>
            )}
          </div>
        )
      })}
    </section>
  )
}

export default SubscriptionsPage
