import {
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Globe,
  Keyboard,
  Languages,
  LogIn,
  MessageSquareWarning,
  Moon,
  Settings,
  ShieldUser,
  SquareUser,
  UserCircle,
  UserCog,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../i18n'
import { languageLabel, LANGUAGES, LOCATIONS } from '../utils/account'

/* ─── Shared sub-components ─── */

function PanelHeader({ title, onBack }) {
  return (
    <button className="yt-acct-panel-header" type="button" onClick={onBack}>
      <ArrowLeft size={24} />
      <span>{title}</span>
    </button>
  )
}

function Choice({ checked, label, onClick }) {
  return (
    <button
      className={`yt-acct-choice ${checked ? 'selected' : ''}`}
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onClick}
    >
      <span className="yt-acct-radio" />
      {label}
    </button>
  )
}

/* Google "G" logo SVG (matches real YouTube dropdown) */
function GoogleG() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.2 33.6 29.7 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l6.1-6.1C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z" />
      <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.8 1.1 8 2.9l6.1-6.1C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#FBBC05" d="M24 44c5.4 0 10.2-1.8 13.9-4.9l-6.4-5.3C29.6 35.6 26.9 36.5 24 36.5c-5.6 0-10.3-3.8-12-9l-6.9 5.3C8.8 39.6 15.9 44 24 44z" />
      <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 3-3.4 5.5-6.5 7l6.4 5.3C40.4 37.1 44.5 31 44.5 24c0-1.3-.1-2.7-.2-4z" />
    </svg>
  )
}

/* YouTube Studio hexagon-play icon */
function StudioIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />
      <path d="M10 8.9v6.2l5.2-3.1z" />
    </svg>
  )
}

/* ─── Menu row (icon + label + optional arrow) ─── */
function MenuItem({ icon, label, onClick, hasArrow = false, className = '' }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`yt-acct-item ${className}`}
      onClick={onClick}
    >
      <span className="yt-acct-item-icon">{icon}</span>
      <span className="yt-acct-item-label">{label}</span>
      {hasArrow && <ChevronRight size={24} className="yt-acct-item-arrow" />}
    </button>
  )
}

/* ─── Main component ─── */
function AccountMenu({
  user,
  isAuthenticated,
  prefs,
  accounts,
  onNavigate,
  onSignOut,
  onSwitchAccount,
  onAddAccount,
  onPrefsChange,
  onClose,
}) {
  const { t } = useI18n()
  const [panel, setPanel] = useState('main')

  const displayName =
    user?.name || user?.username || (isAuthenticated ? t('signedInAccount') : t('guestAccount'))
  const handle = user?.email
    ? `@${user.email.split('@')[0]}`
    : user?.username
    ? `@${user.username}`
    : t('signInContinue')

  const appearanceLabel =
    prefs.appearance === 'dark'
      ? t('dark')
      : prefs.appearance === 'device'
      ? t('device')
      : t('light')

  function go(path) {
    onClose()
    onNavigate(path)
  }

  /* ── Sub-panels ── */
  if (panel === 'accounts') {
    return (
      <div className="yt-acct-dropdown" role="menu">
        <PanelHeader title={t('accounts')} onBack={() => setPanel('main')} />
        <div className="yt-acct-divider" />
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            role="menuitem"
            className="yt-acct-item"
            onClick={() => { onSwitchAccount(account.email); onClose() }}
          >
            <span className="yt-acct-item-icon">
              {account.picture
                ? <img className="yt-acct-mini-avatar" src={account.picture} alt="" />
                : <UserCircle size={24} />}
            </span>
            <span className="yt-acct-item-label">
              {account.name || account.email}
              <small>{account.email}</small>
            </span>
          </button>
        ))}
        <div className="yt-acct-divider" />
        <MenuItem icon={<Users size={24} />} label={t('addAccount')} onClick={() => { onAddAccount(); onClose() }} />
        <MenuItem icon={<LogIn size={24} />} label={t('signOut')} onClick={onSignOut} />
      </div>
    )
  }

  if (panel === 'appearance') {
    return (
      <div className="yt-acct-dropdown" role="menu">
        <PanelHeader title={t('appearance')} onBack={() => setPanel('main')} />
        <p className="yt-acct-hint">{t('appearanceHint')}</p>
        {[['light', t('lightTheme')], ['dark', t('darkTheme')], ['device', t('deviceTheme')]].map(([id, label]) => (
          <Choice key={id} checked={prefs.appearance === id} label={label} onClick={() => onPrefsChange({ appearance: id })} />
        ))}
      </div>
    )
  }

  if (panel === 'language') {
    return (
      <div className="yt-acct-dropdown" role="menu">
        <PanelHeader title={t('chooseLanguage')} onBack={() => setPanel('main')} />
        {LANGUAGES.map((item) => (
          <Choice key={item.id} checked={prefs.language === item.id} label={item.label} onClick={() => onPrefsChange({ language: item.id })} />
        ))}
      </div>
    )
  }

  if (panel === 'restricted') {
    return (
      <div className="yt-acct-dropdown" role="menu">
        <PanelHeader title={t('restrictedMode')} onBack={() => setPanel('main')} />
        <p className="yt-acct-hint">{t('restrictedHint')}</p>
        <Choice checked={!prefs.restricted} label={t('off')} onClick={() => onPrefsChange({ restricted: false })} />
        <Choice checked={prefs.restricted} label={t('on')} onClick={() => onPrefsChange({ restricted: true })} />
      </div>
    )
  }

  if (panel === 'location') {
    return (
      <div className="yt-acct-dropdown" role="menu">
        <PanelHeader title={t('chooseLocation')} onBack={() => setPanel('main')} />
        {LOCATIONS.map((item) => (
          <Choice key={item} checked={prefs.location === item} label={item} onClick={() => onPrefsChange({ location: item })} />
        ))}
      </div>
    )
  }

  /* ── Main panel ── */
  return (
    <div className="yt-acct-dropdown" role="menu">

      {/* ── Header: avatar, name, handle, channel link ── */}
      <div className="yt-acct-header">
        <div className="yt-acct-avatar-wrap">
          {user?.picture
            ? <img className="yt-acct-avatar" src={user.picture} alt={displayName} />
            : <span className="yt-acct-avatar-initials">{displayName.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="yt-acct-header-info">
          <span className="yt-acct-name">{displayName}</span>
          <span className="yt-acct-handle">{handle}</span>
          {isAuthenticated && (
            <button className="yt-acct-channel-link" type="button" onClick={() => go('/channel')}>
              View your channel
            </button>
          )}
        </div>
      </div>

      <div className="yt-acct-divider" />

      {/* ── Section 1: Google Account, Switch account, Sign out ── */}
      <MenuItem icon={<GoogleG />} label="Google Account" onClick={() => go('/account/google')} />
      <MenuItem icon={<SquareUser size={24} />} label="Switch account" onClick={() => setPanel('accounts')} hasArrow />
      <MenuItem icon={<LogIn size={24} />} label="Sign out" onClick={onSignOut} />

      <div className="yt-acct-divider" />

      {/* ── Section 2: YouTube Studio, Purchases ── */}
      <MenuItem icon={<StudioIcon />} label="YouTube Studio" onClick={() => go('/studio')} />
      <MenuItem icon={<CircleDollarSign size={24} />} label="Purchases and memberships" onClick={() => go('/account/purchases')} />

      <div className="yt-acct-divider" />

      {/* ── Section 3: Data, Appearance, Language, Restricted, Location, Shortcuts ── */}
      <MenuItem icon={<ShieldUser size={24} />} label="Your data in YouTube" onClick={() => go('/account/data')} />
      <MenuItem icon={<Moon size={24} />} label={`Appearance: ${appearanceLabel}`} onClick={() => setPanel('appearance')} hasArrow />
      <MenuItem icon={<Languages size={24} />} label={`Display language: ${languageLabel(prefs.language)}`} onClick={() => setPanel('language')} hasArrow />
      <MenuItem icon={<UserCog size={24} />} label={`Restricted Mode: ${prefs.restricted ? 'On' : 'Off'}`} onClick={() => setPanel('restricted')} hasArrow />
      <MenuItem icon={<Globe size={24} />} label={`Location: ${prefs.location}`} onClick={() => setPanel('location')} hasArrow />
      <MenuItem icon={<Keyboard size={24} />} label="Keyboard shortcuts" onClick={() => go('/account/shortcuts')} />

      <div className="yt-acct-divider" />

      {/* ── Section 4: Settings ── */}
      <MenuItem icon={<Settings size={24} />} label="Settings" onClick={() => go('/account/settings')} />

      <div className="yt-acct-divider" />

      {/* ── Section 5: Help, Feedback ── */}
      <MenuItem icon={<CircleHelp size={24} />} label="Help" onClick={() => go('/account/help')} />
      <MenuItem icon={<MessageSquareWarning size={24} />} label="Send feedback" onClick={() => go('/account/feedback')} />
    </div>
  )
}

export default AccountMenu
