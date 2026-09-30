import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from './studioContext'
import { studioTotals } from '../utils/studio'

const INSIDER = [
  {
    id: 'dQw4w9WgXcQ',
    title: '2026 YouTube algorithm creator tips',
    body: "YouTube's Todd Beaupré & Rene Ritchie explain video ranking, viewer-first metrics, debunking myths, and building long-term audience value.",
    thumb: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    badge: 'Inside YouTube The Algorithm 2026',
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'How discovery works for new uploads',
    body: 'Learn how viewers find your first videos and what to publish next.',
    thumb: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    badge: 'Creator Insider',
  },
  {
    id: 'L_jWHffIx5E',
    title: 'Thumbnails and titles that get clicks',
    body: 'Package your uploads so they stand out in this app’s home and search.',
    thumb: 'https://i.ytimg.com/vi/L_jWHffIx5E/hqdefault.jpg',
    badge: 'Packaging',
  },
  {
    id: '9bZkp7q19f0',
    title: 'Growing a channel from zero',
    body: 'Upload consistently, reply in Community, and check Analytics after each publish.',
    thumb: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    badge: 'Growth',
  },
]

const NEWS = [
  { title: 'Increasing Shorts length', body: 'Short-form uploads in this app can run longer than before. Use Create to publish one.' },
  { title: 'Expansion of channel permissions', body: 'Customization and Settings now control how your channel appears to viewers in this app.' },
]

function StudioIllustration() {
  return (
    <svg className="studio-illustration" viewBox="0 0 220 160" aria-hidden="true">
      <ellipse cx="110" cy="148" rx="70" ry="8" fill="#e8f4ff" />
      <rect x="78" y="92" width="88" height="48" rx="6" fill="#7fd0ff" />
      <rect x="88" y="100" width="68" height="32" rx="3" fill="#fff" />
      <rect x="96" y="108" width="28" height="4" rx="2" fill="#c5e9ff" />
      <rect x="96" y="116" width="40" height="4" rx="2" fill="#c5e9ff" />
      <circle cx="86" cy="58" r="18" fill="#7fd0ff" />
      <path d="M72 88c4-18 24-22 32-8 6 10 18 12 24 4v28H70z" fill="#7fd0ff" />
      <circle cx="148" cy="70" r="10" fill="#7fd0ff" />
      <rect x="142" y="80" width="14" height="22" rx="4" fill="#7fd0ff" />
    </svg>
  )
}

function StudioDashboard() {
  const { uploads = [], onUploadClick, open } = useStudio()
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)
  const [newsOpen, setNewsOpen] = useState('')
  const totals = studioTotals(uploads)
  const latest = uploads[0]
  const top = [...uploads].sort((left, right) => (Number(right.views) || 0) - (Number(left.views) || 0))[0]
  const item = INSIDER[slide]

  return (
    <div className="studio-dash">
      <section className="studio-card studio-upload-card">
        {latest ? (
          <button type="button" className="studio-latest" onClick={() => open(latest)}>
            <img src={latest.thumbnail_url} alt="" />
            <div>
              <h2>{latest.title}</h2>
              <p>{latest.views || 0} views on your latest upload</p>
            </div>
          </button>
        ) : (
          <>
            <StudioIllustration />
            <p>Want to see metrics on your recent video? Upload and publish a video to get started.</p>
            <button className="studio-upload-btn" type="button" onClick={onUploadClick}>Upload videos</button>
          </>
        )}
      </section>
      <section className="studio-card">
        <h2>Channel analytics</h2>
        <p className="studio-kicker">Current subscribers</p>
        <strong className="studio-big">{totals.subscribers}</strong>
        <hr />
        <h3>Summary</h3>
        <p className="studio-kicker">Last 28 days</p>
        <ul className="studio-metrics">
          <li><span>Views</span><b>{uploads.length ? totals.views : '0 —'}</b></li>
          <li><span>Watch time (hours)</span><b>{uploads.length ? totals.watchHours : '0.0 —'}</b></li>
        </ul>
        <h3>Top content</h3>
        <p className="studio-kicker">Last 48 hours · Views</p>
        {top ? <p>{top.title} · {top.views || 0}</p> : <p className="studio-muted">Upload to see top content.</p>}
        <button className="studio-ghost" type="button" onClick={() => navigate('/studio/analytics')}>Go to channel analytics</button>
      </section>
      <aside className="studio-side">
        <section className="studio-card">
          <header className="studio-card-head">
            <h2>Creator Insider</h2>
            <div className="studio-pager">
              <button type="button" aria-label="Previous" onClick={() => setSlide((value) => (value - 1 + INSIDER.length) % INSIDER.length)}><ChevronLeft size={16} /></button>
              <span>{slide + 1} / {INSIDER.length}</span>
              <button type="button" aria-label="Next" onClick={() => setSlide((value) => (value + 1) % INSIDER.length)}><ChevronRight size={16} /></button>
            </div>
          </header>
          <article className="insider-card">
            <div className="insider-thumb">
              <img src={item.thumb} alt="" />
              <b>{item.badge}</b>
            </div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <button
              type="button"
              className="studio-ghost"
              onClick={() => open({ id: item.id, title: item.title, thumbnail_url: item.thumb, video_url: `https://www.youtube.com/watch?v=${item.id}` })}
            >
              Watch on YouTube
            </button>
          </article>
        </section>
        <section className="studio-card">
          <h2>What’s new in Studio</h2>
          <ul className="studio-news">
            {NEWS.map((entry) => (
              <li key={entry.title}>
                <button type="button" onClick={() => setNewsOpen((value) => value === entry.title ? '' : entry.title)}>{entry.title}</button>
                {newsOpen === entry.title && <p>{entry.body}</p>}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}

export default StudioDashboard
