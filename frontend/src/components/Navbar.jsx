import { Bell, ChevronDown, Menu, Mic, Plus, Radio, UserCircle, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import AccountMenu from './AccountMenu'
import YouTubeLogo from './YouTubeLogo'
import { useEffect, useRef, useState } from 'react'
import { activateAccount, loadAccounts, loadPrefs, readActiveUser, removeActiveAccount, savePrefs, upsertAccount } from '../utils/account'
import { readGoogleProfile } from '../utils/googleAuth'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { useI18n } from '../i18n'

const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', es: 'es-ES', fr: 'fr-FR' }

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

function getInitials(profile) {
  const nameParts = (profile?.name || '').trim().split(/\s+/).filter(Boolean)
  if (nameParts.length >= 2) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  return (nameParts[0]?.slice(0, 2) || profile?.email?.slice(0, 2) || 'U').toUpperCase()
}

function Navbar({ onMenuClick, onHome, onUploadClick, onSearch, onSearchChange, onSearchSuggestions, onPickVideo }) {
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const googleButtonRef = useRef(null)
  const accountMenuRef = useRef(null)
  const createMenuRef = useRef(null)
  const recognitionRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [user, setUser] = useState(readActiveUser)
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('access_token') && readActiveUser()))
  const [accounts, setAccounts] = useState(loadAccounts)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [suggestions, setSuggestions] = useState({ queries: [], videos: [] })
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  useEffect(() => {
    function refresh() {
      const nextUser = readActiveUser()
      setUser(nextUser)
      setIsAuthenticated(Boolean(localStorage.getItem('access_token') && nextUser))
      setAccounts(loadAccounts())
      setPrefs(loadPrefs())
    }
    window.addEventListener('yt-account-change', refresh)
    window.addEventListener('yt-prefs-change', refresh)
    return () => {
      window.removeEventListener('yt-account-change', refresh)
      window.removeEventListener('yt-prefs-change', refresh)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0)
      return
    }
    const token = localStorage.getItem('access_token')
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API_URL}/users/me`, { headers }),
      fetch(`${API_URL}/notifications`, { headers }),
    ]).then(async ([profileResponse, notificationResponse]) => {
      if (profileResponse.ok) {
        const profile = await profileResponse.json()
        const storedProfile = { ...user, ...profile, name: profile.username || profile.name || user?.name, picture: profile.avatar_url || profile.picture || user?.picture }
        localStorage.setItem('auth_user', JSON.stringify(storedProfile))
        setUser(storedProfile)
        upsertAccount(storedProfile, token)
      }
      if (notificationResponse.ok) {
        const data = await notificationResponse.json()
        setUnreadNotifications(data.unread_count || 0)
      }
    }).catch(() => {})
  }, [isAuthenticated])

  const { error: googleErrorKey, setError: setGoogleError, openGoogleSignIn: startGoogleSignIn, originHelp } = useGoogleAuth({
    googleButtonRef,
    onSuccess: (credential, accessToken) => {
      const profile = readGoogleProfile(credential)
      localStorage.setItem('access_token', accessToken)
      if (profile) {
        localStorage.setItem('auth_user', JSON.stringify(profile))
        upsertAccount(profile, accessToken)
        setUser(profile)
      }
      setIsAuthenticated(true)
      setAccounts(loadAccounts())
    },
  })
  const googleError = googleErrorKey === 'googleOriginMismatch' ? originHelp : (googleErrorKey ? t(googleErrorKey) : '')

  function signOut() {
    const next = removeActiveAccount()
    window.google?.accounts?.id?.disableAutoSelect()
    setIsAccountMenuOpen(false)
    setUser(next)
    setIsAuthenticated(Boolean(next))
    setAccounts(loadAccounts())
  }

  function switchAccount(email) {
    const next = activateAccount(email)
    if (!next) return
    setUser(next)
    setIsAuthenticated(true)
    setIsAccountMenuOpen(false)
  }

  function openGoogleSignIn() {
    setIsAccountMenuOpen(false)
    startGoogleSignIn()
  }

  useEffect(() => {
    function closeMenus(event) {
      if (!accountMenuRef.current?.contains(event.target)) setIsAccountMenuOpen(false)
      if (!createMenuRef.current?.contains(event.target)) setIsCreateMenuOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenus)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenus)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function toggleVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = SPEECH_LANG[lang] || 'en-IN'
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join('')
      setSearchQuery(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  return (
    <header className="navbar">
      {googleError && (
        <div className="google-auth-error" role="alert">
          <p>{googleError}</p>
          <button type="button" onClick={() => setGoogleError('')}>{t('googleAuthDismiss')}</button>
        </div>
      )}
      <div className="brand-group">
        <button className="icon-button" aria-label={t('openMenu')} onClick={onMenuClick}><Menu size={22} /></button>
        <button className="brand" type="button" onClick={onHome} aria-label={t('home')}><YouTubeLogo /></button>
      </div>
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        suggestions={suggestions}
        onSearch={onSearch}
        onSearchChange={onSearchChange}
        onSearchSuggestions={(value) => Promise.resolve(onSearchSuggestions?.(value)).then((items) => {
          const next = items && !Array.isArray(items) ? items : { queries: [], videos: items || [] }
          setSuggestions(next)
          return next
        }).catch(() => {
          const empty = { queries: [], videos: [] }
          setSuggestions(empty)
          return empty
        })}
        onClearSuggestions={() => setSuggestions({ queries: [], videos: [] })}
        onPickVideo={onPickVideo}
      >
        <button className={`icon-button mic-button ${isListening ? 'listening' : ''}`} type="button" aria-label={isListening ? t('stopListening') : t('voiceSearch')} onClick={toggleVoiceSearch} title={isListening ? t('stopListening') : t('voiceSearch')}><Mic size={19} /></button>
      </SearchBar>
      <div className="nav-actions">
        <div className="google-auth">
          <div ref={googleButtonRef} className={isAuthenticated ? 'google-hidden' : ''} />
        </div>
        <div className="create-menu" ref={createMenuRef}>
          <button className="create-button" type="button" aria-expanded={isCreateMenuOpen} onClick={() => setIsCreateMenuOpen((open) => !open)}><Plus size={18} /> {t('create')}</button>
          {isCreateMenuOpen && (
            <div className="create-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={() => { setIsCreateMenuOpen(false); onUploadClick() }}><Video size={21} /> <span>{t('uploadVideo')}</span></button>
              <button type="button" role="menuitem" className="live-action" onClick={() => { setIsCreateMenuOpen(false); navigate('/studio/live') }}><Radio size={21} /> <span>{t('goLive')}</span></button>
            </div>
          )}
        </div>
        <div className="notification-menu">
          <button className="notification-button icon-button" type="button" aria-label={t('notifications')} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={20} />{unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button>
          {notificationsOpen && <div className="notifications-dropdown"><strong>{t('notifications')}</strong><button type="button"><Bell size={18} />{t('caughtUp')}</button><small>{t('notifHint')}</small></div>}
        </div>
        <div className="account-menu" ref={accountMenuRef}>
          <button className="profile-button" type="button" aria-label={t('openAccount')} aria-expanded={isAccountMenuOpen} onClick={() => setIsAccountMenuOpen((open) => !open)}>
            {isAuthenticated && user ? (user.picture ? <img className="profile-avatar" src={user.picture} alt="" /> : <span className="profile-initials">{getInitials(user)}</span>) : <UserCircle size={29} />}
            <ChevronDown size={13} />
          </button>
          {isAccountMenuOpen && (
            <AccountMenu
              user={user}
              isAuthenticated={isAuthenticated}
              prefs={prefs}
              accounts={accounts}
              onNavigate={navigate}
              onSignOut={signOut}
              onSwitchAccount={switchAccount}
              onAddAccount={openGoogleSignIn}
              onPrefsChange={(partial) => setPrefs(savePrefs(partial))}
              onClose={() => setIsAccountMenuOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
