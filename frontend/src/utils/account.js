import { load } from './video'

export const PREFS_KEY = 'yt-prefs'
export const ACCOUNTS_KEY = 'yt-accounts'
export const CHANNEL_KEY = 'yt-channel'
export const MEMBERSHIPS_KEY = 'yt-memberships'
export const FEEDBACK_KEY = 'yt-feedback'
export const HISTORY_PAUSED_KEY = 'yt-history-paused'

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'mr', label: 'मराठी' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
]

export const LOCATIONS = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia']

export const DEFAULT_PREFS = {
  appearance: 'light',
  language: 'en',
  restricted: false,
  location: 'India',
}

const RESTRICTED_TERMS = ['nsfw', 'xxx', '18+', 'explicit']

export function loadPrefs() {
  return { ...DEFAULT_PREFS, ...load(PREFS_KEY, {}) }
}

export function savePrefs(prefs) {
  const next = { ...loadPrefs(), ...prefs }
  localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  applyAppearance(next.appearance)
  document.documentElement.lang = next.language || 'en'
  window.dispatchEvent(new CustomEvent('yt-prefs-change', { detail: next }))
  return next
}

export function applyAppearance(mode) {
  const appearance = mode || loadPrefs().appearance
  const dark = appearance === 'dark' || (appearance === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function languageLabel(id) {
  return LANGUAGES.find((item) => item.id === id)?.label || 'English'
}

export function loadAccounts() {
  return load(ACCOUNTS_KEY, [])
}

export function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  window.dispatchEvent(new CustomEvent('yt-account-change'))
  return accounts
}

export function accountHandle(user) {
  const source = user?.username || user?.email || user?.name || 'guest'
  return `@${String(source).split('@')[0].toLowerCase().replace(/\s+/g, '')}`
}

export function upsertAccount(profile, accessToken) {
  if (!profile?.email) return loadAccounts()
  const accounts = loadAccounts().filter((item) => item.email !== profile.email)
  const next = [{ ...profile, access_token: accessToken, active: true }, ...accounts.map((item) => ({ ...item, active: false }))]
  return saveAccounts(next)
}

export function activateAccount(email) {
  const accounts = loadAccounts()
  const selected = accounts.find((item) => item.email === email)
  if (!selected) return null
  saveAccounts(accounts.map((item) => ({ ...item, active: item.email === email })))
  if (selected.access_token) localStorage.setItem('access_token', selected.access_token)
  localStorage.setItem('auth_user', JSON.stringify(selected))
  window.dispatchEvent(new CustomEvent('yt-account-change'))
  return selected
}

export function removeActiveAccount() {
  const accounts = loadAccounts()
  const remaining = accounts.filter((item) => !item.active)
  const next = remaining[0]
  saveAccounts(remaining.map((item, index) => ({ ...item, active: index === 0 })))
  if (next) {
    if (next.access_token) localStorage.setItem('access_token', next.access_token)
    localStorage.setItem('auth_user', JSON.stringify(next))
    return next
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('auth_user')
  return null
}

export function readActiveUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user')) || null
  } catch {
    return null
  }
}

export function loadChannelProfile(user) {
  const stored = load(CHANNEL_KEY, {})
  return {
    name: stored.name || user?.name || user?.username || 'Your channel',
    handle: stored.handle || accountHandle(user),
    description: stored.description || 'Welcome to my channel. Videos I upload stay in this app.',
    picture: stored.picture || user?.picture || user?.avatar_url || '',
  }
}

export function saveChannelProfile(profile) {
  const next = { ...loadChannelProfile(), ...profile }
  localStorage.setItem(CHANNEL_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('yt-account-change'))
  return next
}

export const CHANNEL_FOLLOWERS_KEY = 'yt-channel-followers'

export function youtubeUsername(user) {
  const handle = user?.username || user?.handle || user?.customUrl
  if (handle) return String(handle).startsWith('@') ? String(handle) : `@${String(handle).replace(/^@/, '')}`
  if (user?.email) return `@${String(user.email).split('@')[0]}`
  if (user?.name) return user.name
  return ''
}

export function loadChannelSubscribers() {
  return load(CHANNEL_FOLLOWERS_KEY, [])
}

export function channelSubscriberCount() {
  return loadChannelSubscribers().length
}

export function isChannelOwner(video, user = readActiveUser()) {
  const ownerId = video?.owner_id != null ? String(video.owner_id) : ''
  if (user?.id && ownerId && ownerId !== 'guest' && ownerId === String(user.id)) return true
  if (user?.id && ownerId && ownerId !== 'guest' && ownerId !== String(user.id)) return false
  if (!user) return true
  const profile = loadChannelProfile(user)
  const names = [profile.name, user?.name, user?.username].filter(Boolean).map((value) => String(value).toLowerCase())
  return names.includes(String(video?.channel_name || '').toLowerCase())
}

export function addChannelSubscriber(user) {
  const handle = youtubeUsername(user) || accountHandle(user)
  const name = user?.name || user?.username || handle
  if (!name && !handle) return loadChannelSubscribers()
  const current = loadChannelSubscribers()
  const key = String(user?.email || handle).toLowerCase()
  if (current.some((item) => String(item.email || item.handle).toLowerCase() === key)) return current
  const next = [{ name, handle, email: user?.email || '', at: Date.now() }, ...current]
  localStorage.setItem(CHANNEL_FOLLOWERS_KEY, JSON.stringify(next))
  localStorage.setItem('yt-channel-subs', String(next.length))
  window.dispatchEvent(new CustomEvent('yt-account-change'))
  return next
}

export function removeChannelSubscriber(user) {
  const key = String(user?.email || youtubeUsername(user) || accountHandle(user)).toLowerCase()
  const next = loadChannelSubscribers().filter((item) => String(item.email || item.handle).toLowerCase() !== key)
  localStorage.setItem(CHANNEL_FOLLOWERS_KEY, JSON.stringify(next))
  localStorage.setItem('yt-channel-subs', String(next.length))
  window.dispatchEvent(new CustomEvent('yt-account-change'))
  return next
}

export function isRestrictedVideo(video) {
  if (!loadPrefs().restricted) return false
  const text = `${video?.title || ''} ${video?.description || ''}`.toLowerCase()
  return RESTRICTED_TERMS.some((term) => text.includes(term))
}

export function loadMemberships() {
  return load(MEMBERSHIPS_KEY, [])
}

export function addMembership(name) {
  const next = Array.from(new Set([...loadMemberships(), name]))
  localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(next))
  return next
}

applyAppearance()

const themeQuery = window.matchMedia('(prefers-color-scheme: dark)')
themeQuery.addEventListener('change', () => {
  if (loadPrefs().appearance === 'device') applyAppearance('device')
})
