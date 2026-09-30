import { ChevronLeft, ChevronRight, MessageCircle, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import ShareModal from '../components/ShareModal'
import { API } from '../config'
import { compact, getVideoId, normalize } from '../utils/video'

// Search terms used to keep the Shorts feed flowing when a result set runs out
const FEED_QUERIES = ['shorts', 'funny shorts', 'music shorts', 'gaming shorts', 'tech shorts', 'food shorts', 'travel shorts', 'sports shorts']

function ShortsPage({ catalog = [], likes, dislikes, react }) {
  const [shorts, setShorts] = useState(catalog)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState(catalog.length ? 'ready' : 'loading')
  const [commenting, setCommenting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const cursor = useRef({ q: 0, token: '', busy: false })
  const wheelLock = useRef(0)
  const current = shorts[index]

  const loadMore = useCallback(async () => {
    const state = cursor.current
    if (state.busy) return
    state.busy = true
    try {
      const { data } = await axios.get(`${API}/youtube/shorts/feed`, { params: { q: FEED_QUERIES[state.q % FEED_QUERIES.length], token: state.token }, timeout: 20000 })
      const fresh = (data.items || []).map((item) => normalize({ ...item, is_short: true }))
      // when a query is exhausted, move on to the next one so the feed never ends
      if (data.next) state.token = data.next
      else { state.token = ''; state.q += 1 }
      setShorts((current) => {
        const seen = new Set(current.map((item) => getVideoId(item)))
        return [...current, ...fresh.filter((item) => !seen.has(getVideoId(item)))]
      })
      setStatus('ready')
    } catch {
      setStatus((value) => (value === 'ready' ? value : 'error'))
    } finally {
      state.busy = false
    }
  }, [])

  useEffect(() => { loadMore() }, [loadMore])
  useEffect(() => { if (shorts.length && index >= shorts.length - 4) loadMore() }, [index, shorts.length, loadMore])

  const go = useCallback((delta) => setIndex((value) => Math.max(0, Math.min(shorts.length - 1, value + delta))), [shorts.length])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') go(1)
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') go(-1)
    }
    function onWheel(event) {
      const now = Date.now()
      if (now - wheelLock.current < 600 || Math.abs(event.deltaY) < 20) return
      wheelLock.current = now
      go(event.deltaY > 0 ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [go])

  if (!current) {
    return (
      <div className="empty-state">
        <h2>{status === 'error' ? 'Could not load Shorts' : 'Loading Shorts…'}</h2>
        {status === 'error' && <button className="create-button" type="button" onClick={() => { setStatus('loading'); loadMore() }}>Try again</button>}
      </div>
    )
  }
  const id = getVideoId(current)

  return (
    <section className="shorts-page">
      <div className="shorts-stage">
        <button className="shorts-arrow" type="button" aria-label="Previous short" disabled={index === 0} onClick={() => go(-1)}>
          <ChevronLeft size={22} />
        </button>
        <article className="short-card">
          <iframe src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&mute=0`} title={current.title} allow="autoplay; encrypted-media" />
          <div className="short-caption">
            <strong>{current.title}</strong>
            <span>{current.channel_name ? `@${current.channel_name}` : ''}</span>
          </div>
          <div className="short-actions">
            <button onClick={() => react(id, 'like')}><ThumbsUp fill={likes.includes(id) ? 'currentColor' : 'none'} /><span>{compact((Number(current.likes) || 0) + (likes.includes(id) ? 1 : 0))}</span></button>
            <button onClick={() => react(id, 'dislike')}><ThumbsDown fill={dislikes.includes(id) ? 'currentColor' : 'none'} /><span>Dislike</span></button>
            <button onClick={() => setCommenting((value) => !value)}><MessageCircle /><span>Comment</span></button>
            <button onClick={() => setShareOpen(true)}><Share2 /><span>Share</span></button>
          </div>
          {commenting && (
            <div className="short-comment">
              <input autoFocus placeholder="Add a comment…" onKeyDown={(event) => event.key === 'Enter' && setCommenting(false)} />
              <button onClick={() => setCommenting(false)}>Done</button>
            </div>
          )}
        </article>
        <button className="shorts-arrow" type="button" aria-label="Next short" disabled={index === shorts.length - 1 && status !== 'ready'} onClick={() => go(1)}>
          <ChevronRight size={22} />
        </button>
      </div>
      <p className="shorts-count">{index + 1}</p>
      {shareOpen && <ShareModal video={current} onClose={() => setShareOpen(false)} />}
    </section>
  )
}

export default ShortsPage
