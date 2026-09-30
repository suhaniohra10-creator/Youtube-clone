import { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { useI18n } from '../i18n'

const YOU_PATHS = ['/you', '/channel', '/history', '/playlists', '/watch-later', '/liked', '/downloads', '/your-videos']

function isYouPath(path) {
  return YOU_PATHS.some((to) => path === to || path.startsWith(`${to}/`)) || path.startsWith('/library/')
}

function isActive(path, to) {
  if (to === '/') return path === '/'
  if (to === '/you') return isYouPath(path)
  return path === to || path.startsWith(`${to}/`)
}

function HomeIcon({ active }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4 21V10.08l8-6.96 8 6.96V21h-6v-6h-4v6H4z" />
      </svg>
    )
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 4.33 7 5.83V20h-4v-6H9v6H5v-9.84l7-5.83M12 2 2 10.33V21a1 1 0 0 0 1 1h7v-6h4v6h7a1 1 0 0 0 1-1V10.33L12 2z" />
    </svg>
  )
}

function ShortsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17.77 10.32c-.77-.32-1.2-.5-1.2-.5L18 8.92c1.35-.74 1.84-2.42 1.1-3.77-.74-1.35-2.42-1.84-3.77-1.1l-8.4 4.59c-.98.53-1.57 1.54-1.57 2.65 0 1.1.58 2.11 1.56 2.64.08.04 1.2.5 1.2.5L7 15.33c-1.35.74-1.84 2.42-1.1 3.77.74 1.35 2.42 1.84 3.77 1.1l8.4-4.59c.98-.53 1.57-1.54 1.57-2.65 0-1.1-.59-2.11-1.57-2.64z"
        stroke="currentColor"
        strokeWidth={active ? '2' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
      />
      <path d="m10 14.5 4.5-2.5-4.5-2.5v5z" fill={active ? '#fff' : 'currentColor'} />
    </svg>
  )
}

function SubscriptionsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" />
      <path d="M4 10.5h16" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" />
      <path d="M4 15h7" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" />
      <path d="M4 19h7" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" />
      <path d="M15 14v6l5-3-5-3z" fill="currentColor" />
    </svg>
  )
}

function YouIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.168 18.849a4 4 0 0 1 3.832-2.849h4a4 4 0 0 1 3.834 2.855" />
    </svg>
  )
}

function YourChannelIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="4" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 17.5a5 5 0 0 1 10 0" />
    </svg>
  )
}

function HistoryIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

function PlaylistsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 11h10M4 16h10" />
      <path d="M17 13.5v5.5l4.5-2.75L17 13.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WatchLaterIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

function LikedVideosIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '1.5' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3zm0 0l4-7a2 2 0 0 1 2 2v3h5.5a2.5 2.5 0 0 1 2.45 3.01l-1.5 7.5A2.5 2.5 0 0 1 17 21H7" />
    </svg>
  )
}

function YourVideosIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" />
    </svg>
  )
}

function DownloadsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

function PremiumIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5.5" width="20" height="13" rx="3.5" fill="#ff0033" />
      <path d="M10 8.5 16 12l-6 3.5V8.5Z" fill="#fff" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#ff0033" />
      <circle cx="12" cy="12" r="4.2" fill="#ff0033" stroke="#fff" strokeWidth="2.4" />
      <circle cx="12" cy="12" r="1.5" fill="#fff" />
    </svg>
  )
}

function KidsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="4" fill="#ff0033" />
      <path d="M10 8.5 15.5 12l-5.5 3.5V8.5Z" fill="#fff" />
    </svg>
  )
}

function ShoppingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function MusicNoteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function MoviesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="15" x="2" y="7" rx="2" />
      <path d="m4 7 3-4h3l-3 4" />
      <path d="m11 7 3-4h3l-3 4" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  )
}

const MINI = [
  ['home', HomeIcon, '/'],
  ['shorts', ShortsIcon, '/shorts'],
  ['subscriptions', SubscriptionsIcon, '/subscriptions'],
  ['you', YouIcon, '/you'],
]

const PRIMARY = [
  ['home', HomeIcon, '/'],
  ['shorts', ShortsIcon, '/shorts'],
  ['subscriptions', SubscriptionsIcon, '/subscriptions'],
]

const YOU = [
  ['yourChannel', YourChannelIcon, '/channel'],
  ['history', HistoryIcon, '/history'],
  ['playlists', PlaylistsIcon, '/playlists'],
  ['watchLater', WatchLaterIcon, '/watch-later'],
  ['likedVideos', LikedVideosIcon, '/liked'],
  ['yourVideos', YourVideosIcon, '/your-videos'],
  ['downloads', DownloadsIcon, '/downloads'],
]

const MORE = [
  ['premium', PremiumIcon, '/library/premium', 'Try Premium for $0'],
  ['musicPremium', MusicIcon, '/category/Music', 'YouTube Music'],
  ['youtubeKids', KidsIcon, '/library/kids', 'YouTube Kids'],
]

const EXPLORE_BASE = [
  ['shopping', ShoppingIcon, '/category/Shopping', 'Shopping'],
  ['music', MusicNoteIcon, '/category/Music', 'Music'],
  ['movies', MoviesIcon, '/category/Movies', 'Movies & TV'],
]

const EXPLORE_MORE = [
  ['gaming', ShoppingIcon, '/category/Gaming', 'Gaming'],
  ['news', FlagIcon, '/category/News', 'News'],
  ['sports', MoviesIcon, '/category/Sports', 'Sports'],
  ['podcasts', MusicNoteIcon, '/category/Podcasts', 'Podcasts'],
]

function Sidebar({ open, path, navigate }) {
  const { t } = useI18n()
  const [showMoreExplore, setShowMoreExplore] = useState(false)

  function LinkButton([key, Icon, to, fallback]) {
    const active = isActive(path, to)
    return (
      <button key={to} type="button" className={`sidebar-link ${active ? 'active' : ''}`} onClick={() => navigate(to)}>
        <Icon active={active} />
        <span>{t(key) || fallback || key}</span>
      </button>
    )
  }

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : 'sidebar-mini'}`}>
      <nav className="sidebar-mini-nav" aria-label="Compact navigation">
        {MINI.map(([key, Icon, to]) => {
          const active = isActive(path, to)
          return (
            <button key={to} type="button" className={`mini-link ${active ? 'active' : ''}`} onClick={() => navigate(to)}>
              <Icon active={active} />
              <span>{t(key) || key}</span>
            </button>
          )
        })}
      </nav>

      <nav className="sidebar-expanded" aria-label="Expanded navigation">
        {PRIMARY.map(LinkButton)}
        <hr />

        <button type="button" className={`sidebar-section-title ${path === '/you' ? 'active' : ''}`} onClick={() => navigate('/you')}>
          <span>{t('you')}</span>
          <ChevronRight size={18} strokeWidth={2} />
        </button>
        {YOU.map(LinkButton)}
        <hr />

        <p className="sidebar-label">{t('moreFromYoutube')}</p>
        {MORE.map(LinkButton)}
        <hr />

        <p className="sidebar-label">{t('explore')}</p>
        {EXPLORE_BASE.map(LinkButton)}
        {showMoreExplore && EXPLORE_MORE.map(LinkButton)}
        <button
          type="button"
          className="sidebar-link sidebar-expand-btn"
          onClick={() => setShowMoreExplore((prev) => !prev)}
        >
          {showMoreExplore ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span>{showMoreExplore ? 'Show less' : 'Show more'}</span>
        </button>
        <hr />

        <button
          type="button"
          className={`sidebar-link ${path === '/history' ? 'active' : ''}`}
          onClick={() => navigate('/history')}
        >
          <FlagIcon />
          <span>Report history</span>
        </button>
        <hr />

        {/* YouTube Reference Footer Links */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-links">
            <a href="#about" onClick={(e) => { e.preventDefault(); navigate('/account/help') }}>About</a>
            <a href="#press" onClick={(e) => e.preventDefault()}>Press</a>
            <a href="#copyright" onClick={(e) => e.preventDefault()}>Copyright</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); navigate('/account/feedback') }}>Contact us</a>
            <a href="#creators" onClick={(e) => { e.preventDefault(); navigate('/channel') }}>Creators</a>
            <a href="#advertise" onClick={(e) => e.preventDefault()}>Advertise</a>
            <a href="#developers" onClick={(e) => e.preventDefault()}>Developers</a>
          </div>

          <div className="sidebar-footer-links secondary">
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#policy" onClick={(e) => e.preventDefault()}>Policy & Safety</a>
            <a href="#how" onClick={(e) => e.preventDefault()}>How YouTube works</a>
            <a href="#test" onClick={(e) => e.preventDefault()}>Test new features</a>
          </div>

          <p className="sidebar-copyright">© 2026 Google LLC</p>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
