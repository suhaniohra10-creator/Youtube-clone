import { MoreVertical, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { channelPath } from '../utils/channelLink'
import { PreviewVideo, useHoverPreview } from './HoverPreview'
import ShareModal from './ShareModal'
import { displayAge, formatViews } from '../utils/video'
import { useI18n } from '../i18n'

function VerifiedBadge() {
  return (
    <svg className="yt-channel-verified" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.8-7.8 1.4 1.4-9.2 9.2z" />
    </svg>
  )
}

function VideoCard({ video, onOpen }) {
  const { t } = useI18n()
  const preview = useHoverPreview()
  const navigate = useNavigate()
  const goChannel = (event) => { event.stopPropagation(); navigate(channelPath({ ...video, channel_name: video.channel_name || video.channelTitle })) }
  const [menu, setMenu] = useState(false)
  const [broken, setBroken] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const channel = video.channel_name || video.channelTitle || video.channel || 'Channel Name'
  const thumbnail = video.thumbnail_url || video.thumbnail
  const age = displayAge(video) || '3 days ago'
  const views = formatViews(video.views, t('views'))

  if (broken) return null

  return (
    <article className="video-card" {...preview.bind}>
      <button className="thumbnail" type="button" onClick={() => onOpen(video)} aria-label={`Play ${video.title}`}>
        <img src={thumbnail} alt={video.title} loading="lazy" onError={() => setBroken(true)} onLoad={(event) => { if (event.currentTarget.naturalWidth <= 120) setBroken(true) }} />
        <PreviewVideo video={video} active={preview.active} onEnded={preview.stop} />
        <span className="duration">{video.duration || '12:34'}</span>
      </button>

      {shareOpen && <ShareModal video={video} onClose={() => setShareOpen(false)} />}

      <div className="video-meta">
        {video.channel_avatar ? (
          <img className="channel-avatar video-channel-link" src={video.channel_avatar} alt="" onClick={goChannel} />
        ) : (
          <div className="channel-avatar video-channel-link" onClick={goChannel}>{channel[0]?.toUpperCase()}</div>
        )}

        <div className="video-copy">
          <div className="video-title-row">
            <h2 onClick={() => onOpen(video)} title={video.title}>{video.title}</h2>
            <button
              className="more-button"
              type="button"
              aria-label={`More options for ${video.title}`}
              onClick={(e) => {
                e.stopPropagation()
                setMenu((value) => !value)
              }}
            >
              <MoreVertical size={18} />
            </button>
          </div>

          <p className="video-channel-name">
            <span className="video-channel-link" onClick={goChannel}>{channel}</span>
            {video.channel_verified === true && <VerifiedBadge />}
          </p>

          <p className="video-stats-line">
            <span>{views}</span>
            <span className="meta-dot">·</span>
            <span>{age}</span>
          </p>
        </div>

        {menu && (
          <div className="action-menu card-more">
            <button type="button" onClick={() => { setMenu(false); setShareOpen(true) }}>
              <Share2 size={16} /> Share
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default VideoCard
