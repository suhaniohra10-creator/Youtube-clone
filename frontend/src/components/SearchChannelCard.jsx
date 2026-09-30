import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useI18n } from '../i18n'

export default function SearchChannelCard({ channel, subscriptions = [], onToggleSubscribe, onOpenChannel }) {
  const { t } = useI18n()
  const [imgError, setImgError] = useState(false)

  if (!channel) return null

  const isSubscribed = subscriptions.includes(channel.name) || subscriptions.includes(channel.id) || subscriptions.includes(channel.handle)

  function handleSubscribe(e) {
    e.stopPropagation()
    onToggleSubscribe?.(channel.name || channel.id)
  }

  function handleChannelClick() {
    onOpenChannel?.(channel)
  }

  return (
    <div className="search-channel-card" onClick={handleChannelClick} role="button" tabIndex={0}>
      <div className="search-channel-avatar-wrap">
        {channel.avatar && !imgError ? (
          <img
            className="search-channel-avatar"
            src={channel.avatar}
            alt={channel.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="search-channel-avatar-fallback">
            {(channel.name || 'C')[0].toUpperCase()}
          </div>
        )}
      </div>

      <div className="search-channel-info">
        <div className="search-channel-header">
          <h2 className="search-channel-name">
            {channel.name}
            {channel.verified === true && (
              <span className="channel-verified-badge" title="Verified">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.8-7.8 1.4 1.4-9.2 9.2z" />
                </svg>
              </span>
            )}
          </h2>
        </div>

        <p className="search-channel-meta">
          <span>{channel.handle}</span>
          <span className="meta-dot">•</span>
          <span>{channel.subscribers}</span>
          {channel.video_count > 0 && <><span className="meta-dot">•</span><span>{channel.video_count.toLocaleString()} videos</span></>}
        </p>

        {channel.description && (
          <p className="search-channel-desc">
            {channel.description}
          </p>
        )}
      </div>

      <div className="search-channel-action">
        <button
          type="button"
          className={`channel-sub-btn ${isSubscribed ? 'subscribed' : 'subscribe'}`}
          onClick={handleSubscribe}
          aria-label={isSubscribed ? t('subscribed') : t('subscribe')}
        >
          {isSubscribed ? (
            <>
              <Bell size={16} />
              <span>{t('subscribed')}</span>
            </>
          ) : (
            <span>{t('subscribe')}</span>
          )}
        </button>
      </div>
    </div>
  )
}
