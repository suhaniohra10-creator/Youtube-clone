import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { channelPath } from '../utils/channelLink'
import { displayAge, formatViews } from '../utils/video'
import { useI18n } from '../i18n'

function SearchResultRow({ video, onOpen }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showSummary, setShowSummary] = useState(false)
  const channel = video.channel_name || video.channelTitle || video.channel || 'Channel'
  const thumbnail = video.thumbnail_url || video.thumbnail
  const age = displayAge(video) || t('recently')
  const description = (video.description || '').trim()

  // Generate a clean summary snippet if available
  const summarySnippet = video.summary || description
    ? `${description.slice(0, 140)}${description.length > 140 ? '...' : ''}`
    : `${channel} presents: ${video.title}. Watch now for the full experience.`

  return (
    <article className="search-result-row">
      <button className="search-result-thumb" type="button" onClick={() => onOpen(video)} aria-label={`Play ${video.title}`}>
        <img src={thumbnail} alt="" />
        <span className="duration">{video.duration || '12:34'}</span>
      </button>

      <div className="search-result-copy">
        <div className="search-result-topline">
          <button type="button" className="search-result-title-btn" onClick={() => onOpen(video)}>
            <h2>{video.title}</h2>
          </button>
          <button type="button" className="search-result-more-btn" aria-label="More options">
            <MoreVertical size={18} />
          </button>
        </div>

        <p className="search-result-stats">{formatViews(video.views, t('views'))} • {age}</p>

        <div className="search-result-channel">
          {video.channel_avatar ? (
            <img className="search-result-avatar" src={video.channel_avatar} alt="" />
          ) : (
            <span className="search-result-avatar">{channel[0]?.toUpperCase()}</span>
          )}
          <div className="search-result-channel-info">
            <span className="search-result-channel-name video-channel-link" onClick={(event) => { event.stopPropagation(); navigate(channelPath({ ...video, channel_name: channel })) }}>
              {channel}
              {video.channel_verified === true && <svg className="channel-verified-mini" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.8-7.8 1.4 1.4-9.2 9.2z" />
              </svg>}
            </span>
          </div>
        </div>

        {description ? <p className="search-result-desc">{description}</p> : null}

        <div className="search-result-badges">
          <span className="search-badge">New</span>
          <span className="search-badge">4K</span>
        </div>

        {summarySnippet && (
          <div className={`search-result-ai-summary ${showSummary ? 'expanded' : ''}`}>
            <button
              type="button"
              className="ai-summary-toggle"
              onClick={() => setShowSummary((prev) => !prev)}
            >
              <Sparkles size={14} className="sparkle-icon" />
              <strong className="summary-label">Summary</strong>
              <span className="summary-text-preview">{summarySnippet}</span>
              {showSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default SearchResultRow
