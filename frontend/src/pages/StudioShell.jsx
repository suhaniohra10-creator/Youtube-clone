import { BarChart3, Bell, Captions, CircleHelp, DollarSign, LayoutDashboard, ListVideo, Menu, MessageSquare, MessageSquareWarning, Palette, Plus, Radio, ScanSearch, Search, Settings, Sparkles, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { loadChannelProfile, readActiveUser } from '../utils/account'
import { listStudioVideos } from '../utils/studio'
import { StudioContext } from './studioContext'
import StudioDashboard from './StudioDashboard'
import { StudioAnalytics, StudioCommunity, StudioContent, StudioCopyright, StudioCustomization, StudioEarn, StudioFeedback, StudioLive, StudioSettings, StudioSubtitles } from './StudioSections'
import YouTubeLogo from '../components/YouTubeLogo'

const NAV = [
  ['dashboard', '/', LayoutDashboard, 'Dashboard'],
  ['content', '/content', ListVideo, 'Content'],
  ['analytics', '/analytics', BarChart3, 'Analytics'],
  ['community', '/community', MessageSquare, 'Community'],
  ['subtitles', '/subtitles', Captions, 'Subtitles'],
  ['copyright', '/copyright', ScanSearch, 'Content detection'],
  ['earn', '/earn', DollarSign, 'Earn'],
  ['customization', '/customization', Palette, 'Customization'],
  ['settings', '/settings', Settings, 'Settings'],
  ['feedback', '/feedback', MessageSquareWarning, 'Send feedback'],
]

const PAGES = {
  '': StudioDashboard,
  content: StudioContent,
  analytics: StudioAnalytics,
  community: StudioCommunity,
  subtitles: StudioSubtitles,
  copyright: StudioCopyright,
  earn: StudioEarn,
  customization: StudioCustomization,
  settings: StudioSettings,
  feedback: StudioFeedback,
  live: StudioLive,
}

function StudioShell({ catalog, open, onUploadClick, onDeleted }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [ask, setAsk] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const user = readActiveUser()
  const profile = loadChannelProfile(user)
  const uploads = useMemo(() => listStudioVideos(catalog), [catalog])
  const initial = (profile.name || 'S')[0].toUpperCase()
  const props = { catalog, uploads, open, onUploadClick, onDeleted, query, profile }
  const section = location.pathname.replace(/^\/studio\/?/, '').split('/')[0]
  const Page = PAGES[section] || StudioDashboard

  function closeMenus() {
    setCreateOpen(false)
    setHelpOpen(false)
    setNotesOpen(false)
    setProfileOpen(false)
  }

  function askStudio(event) {
    event.preventDefault()
    const text = question.toLowerCase()
    if (text.includes('upload') || text.includes('create')) setAnswer('Use Create → Upload videos. Published videos appear on Content and Analytics.')
    else if (text.includes('sub')) setAnswer('Open Subtitles, pick a video, and save captions. They stay in this app.')
    else if (text.includes('earn') || text.includes('money')) setAnswer('Earn shows monetization status. Memberships are under Purchases in the account menu.')
    else if (text.includes('live')) setAnswer('Create → Go live opens the Live page. Streams stay inside this app.')
    else setAnswer('Try Content for uploads, Analytics for views, or Customization to edit your channel.')
  }

  function searchChannel(event) {
    event.preventDefault()
    navigate('/studio/content')
  }

  return (
    <StudioContext.Provider value={props}>
      <div className={`studio-shell ${menuOpen ? '' : 'studio-collapsed'}`}>
        <header className="studio-topbar">
          <div className="studio-brand">
            <button className="icon-button" type="button" aria-label="Studio menu" onClick={() => setMenuOpen((value) => !value)}><Menu size={22} /></button>
            <button className="studio-logo" type="button" onClick={() => navigate('/studio')}>
              <YouTubeLogo country="" word="Studio" />
            </button>
          </div>
          <form className="studio-search" onSubmit={searchChannel}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => {
                const value = event.target.value
                setQuery(value)
                if (value.trim() && location.pathname !== '/studio/content') navigate('/studio/content')
              }}
              placeholder="Search across your channel"
            />
          </form>
          <div className="studio-top-actions">
            <div className="studio-menu-wrap">
              <button className="icon-button" type="button" aria-label="Help" onClick={() => { closeMenus(); setHelpOpen((value) => !value) }}><CircleHelp size={20} /></button>
              {helpOpen && (
                <div className="studio-popover" role="menu">
                  <button type="button" onClick={() => { setHelpOpen(false); navigate('/account/help') }}>Studio Help</button>
                  <button type="button" onClick={() => { setHelpOpen(false); navigate('/studio') }}>Dashboard tips</button>
                  <button type="button" onClick={() => { setHelpOpen(false); navigate('/studio/feedback') }}>Send feedback</button>
                </div>
              )}
            </div>
            <div className="studio-menu-wrap">
              <button className="icon-button notification-button" type="button" aria-label="Notifications" onClick={() => { closeMenus(); setNotesOpen((value) => !value) }}>
                <Bell size={20} />
                {uploads.length > 0 && <span className="notification-badge">{uploads.length}</span>}
              </button>
              {notesOpen && (
                <div className="notifications-dropdown studio-notes" role="menu">
                  <strong>Notifications</strong>
                  {uploads.slice(0, 5).map((video) => (
                    <button key={video.id || video.title} type="button" onClick={() => { setNotesOpen(false); open(video) }}>
                      <Bell size={16} /> {video.title}
                    </button>
                  ))}
                  {!uploads.length && <small>You are all caught up. Upload a video to see activity here.</small>}
                </div>
              )}
            </div>
            <button className="studio-ask" type="button" onClick={() => { closeMenus(); setAsk((value) => !value) }}><Sparkles size={16} /> <span>Ask Studio</span></button>
            <div className="studio-menu-wrap">
              <button className="studio-create" type="button" onClick={() => { closeMenus(); setCreateOpen((value) => !value) }}><Plus size={16} /> Create</button>
              {createOpen && (
                <div className="create-dropdown" role="menu">
                  <button type="button" onClick={() => { setCreateOpen(false); onUploadClick() }}><Video size={20} /> Upload videos</button>
                  <button type="button" onClick={() => { setCreateOpen(false); navigate('/studio/live') }}><Radio size={20} /> Go live</button>
                  <button type="button" onClick={() => { setCreateOpen(false); navigate('/studio/community') }}><MessageSquare size={20} /> Create post</button>
                </div>
              )}
            </div>
            <div className="studio-menu-wrap">
              <button className="profile-initials" type="button" aria-label="Account" onClick={() => { closeMenus(); setProfileOpen((value) => !value) }}>{initial}</button>
              {profileOpen && (
                <div className="studio-popover" role="menu">
                  <button type="button" onClick={() => { setProfileOpen(false); navigate('/channel') }}>Your channel</button>
                  <button type="button" onClick={() => { setProfileOpen(false); navigate('/') }}>YouTube</button>
                  <button type="button" onClick={() => { setProfileOpen(false); navigate('/account/settings') }}>Settings</button>
                </div>
              )}
            </div>
          </div>
        </header>
        {ask && (
          <form className="studio-ask-box" onSubmit={askStudio}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask Studio about uploads, analytics, or captions" />
            <button type="submit">Ask</button>
            {answer && <p>{answer}</p>}
          </form>
        )}
        <div className="studio-body">
          <aside className="studio-nav">
            <button className="studio-channel" type="button" onClick={() => navigate('/channel')}>
              {profile.picture ? <img src={profile.picture} alt="" /> : <span>{initial}</span>}
              <small>Your channel</small>
              <b>{profile.name || user?.name || 'Your channel'}</b>
            </button>
            {NAV.map(([id, path, Icon, label]) => (
              <NavLink
                key={id}
                end={path === '/'}
                to={path === '/' ? '/studio' : `/studio${path}`}
                className={({ isActive }) => `studio-link ${isActive || (path === '/' && location.pathname === '/studio') ? 'active' : ''}`}
              >
                <Icon size={20} /> <span>{label}</span>
              </NavLink>
            ))}
          </aside>
          <main className="studio-main">
            <Page />
          </main>
        </div>
      </div>
    </StudioContext.Provider>
  )
}

export default StudioShell
