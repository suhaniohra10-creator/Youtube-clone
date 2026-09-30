import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import {
  addMembership, HISTORY_PAUSED_KEY, languageLabel, LANGUAGES, loadMemberships,
  loadPrefs, LOCATIONS, readActiveUser, savePrefs, accountHandle,
} from '../utils/account'
import { load } from '../utils/video'

function GoogleSection() {
  const { t } = useI18n()
  const user = readActiveUser()
  const navigate = useNavigate()
  if (!user) {
    return (
      <section className="account-page">
        <h1>{t('googleAccount')}</h1>
        <p>{t('googleSignInHint')}</p>
      </section>
    )
  }
  return (
    <section className="account-page">
      <h1>{t('googleAccount')}</h1>
      <div className="account-card">
        {user.picture ? <img src={user.picture} alt="" /> : <span className="channel-avatar">{(user.name || 'G')[0]}</span>}
        <div>
          <strong>{user.name || user.username}</strong>
          <p>{user.email}</p>
          <p>{accountHandle(user)}</p>
        </div>
      </div>
      <div className="card-actions">
        <button type="button" onClick={() => navigate('/channel')}>{t('viewYourChannel')}</button>
        <button type="button" onClick={() => navigate('/account/settings')}>{t('manageAccount')}</button>
      </div>
    </section>
  )
}

function OfferLogo({ kind }) {
  return (
    <div className="offer-logo">
      <span className="offer-play" aria-hidden="true">▶</span>
      <b>{kind === 'music' ? 'Music' : 'Premium'}</b>
    </div>
  )
}

function PurchasesSection() {
  const { t } = useI18n()
  const [memberships, setMemberships] = useState(loadMemberships)
  const [openPlan, setOpenPlan] = useState('')

  function learnMore(id) {
    setOpenPlan(id)
    setMemberships(addMembership(id))
  }

  const offers = [
    {
      id: 'YouTube Premium',
      kind: 'premium',
      title: t('premiumOfferTitle'),
      body: t('premiumOfferBody'),
    },
    {
      id: 'Music Premium',
      kind: 'music',
      title: t('musicOfferTitle'),
      body: t('musicOfferBody'),
    },
  ]

  return (
    <section className="offers-page">
      <h1>{t('offersFromYoutube')}</h1>
      <div className="offer-grid">
        {offers.map((offer) => {
          const active = memberships.includes(offer.id)
          return (
            <article key={offer.id} className="offer-card">
              <OfferLogo kind={offer.kind} />
              <h2>{offer.title}</h2>
              <p>{offer.body}</p>
              <button type="button" className="learn-more" onClick={() => learnMore(offer.id)}>
                {active ? t('manage') : t('learnMore')}
              </button>
              {openPlan === offer.id && active && (
                <small>{t('activeOnAccount')}</small>
              )}
            </article>
          )
        })}
      </div>
      <article className="offer-membership">
        <div>
          <strong>{t('channelMembership')}</strong>
          <p>{t('channelMembershipHint')}</p>
        </div>
        <button
          type="button"
          className="learn-more"
          onClick={() => setMemberships(addMembership('Channel membership'))}
        >
          {memberships.includes('Channel membership') ? t('manage') : t('get')}
        </button>
      </article>
    </section>
  )
}

function DataSection() {
  const { t } = useI18n()
  const [paused, setPaused] = useState(() => localStorage.getItem(HISTORY_PAUSED_KEY) === 'true')
  const [notice, setNotice] = useState('')

  function downloadData() {
    const payload = {
      user: readActiveUser(),
      prefs: loadPrefs(),
      history: load('yt-history', []),
      likes: load('yt-likes', []),
      watchLater: load('yt-later', []),
      downloads: load('yt-downloads', []),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'youtube-clone-data.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice(t('dataDownloaded'))
  }

  function clearHistory() {
    localStorage.setItem('yt-history', JSON.stringify([]))
    window.dispatchEvent(new Event('yt-history-clear'))
    setNotice(t('historyCleared'))
  }

  function togglePause() {
    const next = !paused
    localStorage.setItem(HISTORY_PAUSED_KEY, String(next))
    setPaused(next)
  }

  return (
    <section className="account-page">
      <h1>{t('yourData')}</h1>
      <p>{t('dataHint')}</p>
      <div className="card-actions">
        <button type="button" onClick={downloadData}>{t('downloadMyData')}</button>
        <button type="button" onClick={togglePause}>{paused ? t('resumeHistory') : t('pauseHistory')}</button>
        <button type="button" onClick={clearHistory}>{t('clearHistory')}</button>
      </div>
      {notice && <p className="account-hint">{notice}</p>}
    </section>
  )
}

function SettingsSection() {
  const { t } = useI18n()
  const [prefs, setPrefs] = useState(loadPrefs)
  function update(partial) {
    setPrefs(savePrefs(partial))
  }
  return (
    <section className="account-page">
      <h1>{t('settings')}</h1>
      <label className="account-field">{t('appearance')}
        <select value={prefs.appearance} onChange={(event) => update({ appearance: event.target.value })}>
          <option value="light">{t('light')}</option>
          <option value="dark">{t('dark')}</option>
          <option value="device">{t('device')}</option>
        </select>
      </label>
      <label className="account-field">{t('displayLanguage')}
        <select value={prefs.language} onChange={(event) => update({ language: event.target.value })}>
          {LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="account-field">{t('location')}
        <select value={prefs.location} onChange={(event) => update({ location: event.target.value })}>
          {LOCATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="account-field check">
        <input type="checkbox" checked={prefs.restricted} onChange={(event) => update({ restricted: event.target.checked })} />
        {t('restrictedMode')}
      </label>
      <p className="account-hint">{t('current')}: {prefs.appearance} · {languageLabel(prefs.language)} · {prefs.location}</p>
    </section>
  )
}

function HelpSection() {
  const { t } = useI18n()
  return (
    <section className="account-page">
      <h1>{t('help')}</h1>
      {[['helpPlay', 'helpPlayBody'], ['helpUpload', 'helpUploadBody'], ['helpSwitch', 'helpSwitchBody']].map(([title, body]) => (
        <article key={title} className="account-card stacked">
          <strong>{t(title)}</strong>
          <p>{t(body)}</p>
        </article>
      ))}
    </section>
  )
}

function FeedbackSection() {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  function submit(event) {
    event.preventDefault()
    const entries = load('yt-feedback', [])
    localStorage.setItem('yt-feedback', JSON.stringify([{ text, at: new Date().toISOString() }, ...entries].slice(0, 20)))
    setSaved(t('thanksFeedback'))
    setText('')
  }
  return (
    <section className="account-page">
      <h1>{t('sendFeedback')}</h1>
      <form className="account-form" onSubmit={submit}>
        <label>{t('describeIssue')}<textarea required rows="6" value={text} onChange={(event) => setText(event.target.value)} /></label>
        <button type="submit">{t('send')}</button>
      </form>
      {saved && <p className="account-hint">{saved}</p>}
    </section>
  )
}

function ShortcutsSection() {
  const { t } = useI18n()
  const shortcuts = [
    ['/', t('focusSearch')],
    ['g then h', t('goHome')],
    ['g then s', t('openStudio')],
    ['g then c', t('openChannel')],
    ['Shift + /', t('keyboardShortcuts')],
    ['Escape', t('closeMenus')],
  ]
  return (
    <section className="account-page">
      <h1>{t('keyboardShortcuts')}</h1>
      <ul className="shortcut-list">
        {shortcuts.map(([keys, label]) => (
          <li key={keys}><kbd>{keys}</kbd> <span>{label}</span></li>
        ))}
      </ul>
    </section>
  )
}

function AccountHub() {
  const { section = 'settings' } = useParams()
  if (section === 'google') return <GoogleSection />
  if (section === 'purchases') return <PurchasesSection />
  if (section === 'data') return <DataSection />
  if (section === 'help') return <HelpSection />
  if (section === 'feedback') return <FeedbackSection />
  if (section === 'shortcuts') return <ShortcutsSection />
  return <SettingsSection />
}

export default AccountHub
