import { MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PreviewVideo, useHoverPreview } from './HoverPreview'
import { formatViews } from '../utils/video'

function ShortCard({ short, onClick, viewsText }) {
  const preview = useHoverPreview()
  return (
    <div className="shorts-shelf-card" onClick={onClick} role="button" tabIndex={0} {...preview.bind}>
      <div className="shorts-thumb-wrap">
        <img
          className="shorts-shelf-img"
          src={short.thumbnail_url || short.thumbnail || `https://i.ytimg.com/vi/${short.id}/hqdefault.jpg`}
          alt={short.title}
        />
        <PreviewVideo video={short} active={preview.active} onEnded={preview.stop} />
      </div>
      <div className="shorts-card-info">
        <div className="shorts-title-row">
          <h3 className="shorts-card-title">{short.title}</h3>
          <button type="button" className="shorts-card-menu-btn" onClick={(e) => e.stopPropagation()} aria-label="More options">
            <MoreVertical size={16} />
          </button>
        </div>
        <p className="shorts-card-views">{viewsText}</p>
      </div>
    </div>
  )
}

function ShortsRedIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17.77 10.32c-.77-.32-1.2-.5-1.2-.5L18 8.92c1.35-.74 1.84-2.42 1.1-3.77-.74-1.35-2.42-1.84-3.77-1.1l-8.4 4.59c-.98.53-1.57 1.54-1.57 2.65 0 1.1.58 2.11 1.56 2.64.08.04 1.2.5 1.2.5L7 15.33c-1.35.74-1.84 2.42-1.1 3.77.74 1.35 2.42 1.84 3.77 1.1l8.4-4.59c.98-.53 1.57-1.54 1.57-2.65 0-1.1-.59-2.11-1.57-2.64z"
        fill="#ff0033"
      />
      <path d="m10 14.5 5-2.5-5-2.5v5z" fill="#fff" />
    </svg>
  )
}

export default function ShortsShelf({ shorts = [], onOpenShort }) {
  const navigate = useNavigate()

  if (!shorts || !shorts.length) return null

  // Display up to 5 shorts in the row matching reference
  const shelfItems = shorts.slice(0, 5)

  function handleShortClick(short) {
    if (onOpenShort) {
      onOpenShort(short)
    } else {
      navigate('/shorts')
    }
  }

  return (
    <section className="shorts-shelf-section">
      <div className="shorts-shelf-header">
        <div className="shorts-shelf-title">
          <ShortsRedIcon />
          <h2>Shorts</h2>
        </div>
        <button type="button" className="shorts-shelf-more" aria-label="More options">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="shorts-shelf-grid">
        {shelfItems.map((short) => {
          const viewsText = typeof short.views === 'string' && short.views.includes('views')
            ? short.views
            : formatViews(short.views, 'views')

          return (
            <ShortCard key={short.id || short.videoId} short={short} viewsText={viewsText} onClick={() => handleShortClick(short)} />
          )
        })}
      </div>
    </section>
  )
}
