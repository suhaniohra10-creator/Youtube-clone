import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API } from '../config'
import { loadChannelProfile, loadMemberships, loadPrefs, readActiveUser, saveChannelProfile, savePrefs } from '../utils/account'
import { loadCommunityPosts, loadSubtitles, saveCommunityPosts, saveSubtitle, studioTotals } from '../utils/studio'
import { displayAge, getVideoId } from '../utils/video'
import { useStudio } from './studioContext'

export function StudioContent() {
  const { uploads = [], open, onUploadClick, onDeleted, query } = useStudio()
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const filtered = uploads.filter((item) => `${item.title} ${item.description || ''}`.toLowerCase().includes((query || '').toLowerCase()))

  async function removeVideo(video) {
    const id = getVideoId(video)
    setBusy(id)
    try {
      const token = localStorage.getItem('access_token')
      if (token && /^[a-f0-9]{24}$/i.test(String(id))) {
        await axios.delete(`${API}/videos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      }
      const remaining = uploads.filter((item) => getVideoId(item) !== id)
      localStorage.setItem('yt-uploads', JSON.stringify(remaining.filter((item) => item.uploaded || String(item.id).startsWith('local-'))))
      onDeleted?.(id)
      setNotice('Video removed from Content')
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Could not delete this video')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="studio-panel">
      <header className="studio-panel-head">
        <h1>Channel content</h1>
        <button className="studio-upload-btn" type="button" onClick={onUploadClick}>Upload videos</button>
      </header>
      {notice && <p className="account-hint">{notice}</p>}
      {filtered.length ? (
        <div className="studio-table">
          {filtered.map((video) => (
            <article key={getVideoId(video)}>
              <button type="button" onClick={() => open(video)}><img src={video.thumbnail_url} alt="" /></button>
              <div>
                <strong>{video.title}</strong>
                <small>{video.views || 0} views · {displayAge(video)} · {video.category || 'All'}</small>
              </div>
              <button type="button" onClick={() => open(video)}>View</button>
              <button type="button" disabled={busy === getVideoId(video)} onClick={() => removeVideo(video)}>Delete</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No content yet</h2>
          <p>Upload a video to manage it here.</p>
        </div>
      )}
    </section>
  )
}

export function StudioAnalytics() {
  const { uploads = [] } = useStudio()
  const totals = studioTotals(uploads)
  return (
    <section className="studio-panel">
      <h1>Channel analytics</h1>
      <div className="studio-stats">
        <article><b>{totals.subscribers}</b><span>Subscribers</span></article>
        <article><b>{totals.views}</b><span>Views · 28 days</span></article>
        <article><b>{totals.watchHours}</b><span>Watch time (hours)</span></article>
      </div>
      <div className="studio-table">
        {uploads.map((video) => (
          <article key={getVideoId(video)}>
            <img src={video.thumbnail_url} alt="" />
            <div>
              <strong>{video.title}</strong>
              <small>{video.views || 0} views · {Number(video.likes) || 0} likes</small>
            </div>
          </article>
        ))}
      </div>
      {!uploads.length && <p className="studio-muted">Upload and publish a video to get started.</p>}
    </section>
  )
}

export function StudioCommunity() {
  const [text, setText] = useState('')
  const [posts, setPosts] = useState(loadCommunityPosts)
  function publish(event) {
    event.preventDefault()
    const next = saveCommunityPosts([{ id: Date.now(), text, at: new Date().toLocaleString() }, ...posts])
    setPosts(next)
    setText('')
  }
  return (
    <section className="studio-panel">
      <h1>Community</h1>
      <form className="account-form" onSubmit={publish}>
        <label>Post to your community<textarea required rows="4" value={text} onChange={(event) => setText(event.target.value)} /></label>
        <button className="studio-upload-btn" type="submit">Post</button>
      </form>
      {posts.map((post) => (
        <article key={post.id} className="studio-card stacked-gap">
          <p>{post.text}</p>
          <small>{post.at}</small>
        </article>
      ))}
      {!posts.length && <p className="studio-muted">Posts you publish appear on your channel community tab.</p>}
    </section>
  )
}

export function StudioSubtitles() {
  const { uploads = [] } = useStudio()
  const [selected, setSelected] = useState(getVideoId(uploads[0]) || '')
  const [text, setText] = useState(() => loadSubtitles()[selected] || '')
  function save(event) {
    event.preventDefault()
    saveSubtitle(selected, text)
  }
  return (
    <section className="studio-panel">
      <h1>Subtitles</h1>
      {!uploads.length ? <p className="studio-muted">Upload a video first, then add captions.</p> : (
        <form className="account-form" onSubmit={save}>
          <label>Video
            <select value={selected} onChange={(event) => { setSelected(event.target.value); setText(loadSubtitles()[event.target.value] || '') }}>
              {uploads.map((video) => <option key={getVideoId(video)} value={getVideoId(video)}>{video.title}</option>)}
            </select>
          </label>
          <label>Captions<textarea rows="8" value={text} onChange={(event) => setText(event.target.value)} placeholder="00:00 Hello viewers..." /></label>
          <button className="studio-upload-btn" type="submit">Save subtitles</button>
        </form>
      )}
    </section>
  )
}

export function StudioCopyright() {
  const { uploads = [] } = useStudio()
  return (
    <section className="studio-panel">
      <h1>Content detection</h1>
      <p className="studio-muted">Copyright claims for videos you uploaded in this app.</p>
      {uploads.map((video) => (
        <article key={getVideoId(video)} className="studio-card">
          <strong>{video.title}</strong>
          <p>No issues found</p>
        </article>
      ))}
      {!uploads.length && <p>No videos to scan yet.</p>}
    </section>
  )
}

export function StudioEarn() {
  const navigate = useNavigate()
  const { uploads = [] } = useStudio()
  const views = studioTotals(uploads).views
  const member = loadMemberships().includes('YouTube Premium')
  return (
    <section className="studio-panel">
      <h1>Earn</h1>
      <div className="studio-stats">
        <article><b>{views}</b><span>Lifetime views</span></article>
        <article><b>{member ? 'On' : 'Off'}</b><span>Premium membership</span></article>
        <article><b>{views >= 1000 ? 'Ready' : 'Not yet'}</b><span>Monetization</span></article>
      </div>
      <p>{views >= 1000 ? 'Your channel meets the view threshold in this app.' : 'Keep publishing. Monetization unlocks after 1,000 views in this app.'}</p>
      <button className="learn-more" type="button" onClick={() => navigate('/account/purchases')}>View purchases and memberships</button>
    </section>
  )
}

export function StudioLive() {
  const { onUploadClick } = useStudio()
  const [title, setTitle] = useState('Live stream')
  const [started, setStarted] = useState(false)
  function start(event) {
    event.preventDefault()
    setStarted(true)
  }
  return (
    <section className="studio-panel">
      <h1>Go live</h1>
      <p className="studio-muted">Streaming stays in this app. Start a session, then upload the recording so viewers can watch it here.</p>
      <form className="account-form" onSubmit={start}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <button className="studio-upload-btn" type="submit">Start streaming</button>
      </form>
      {started && (
        <div className="studio-card stacked-gap">
          <p>You are live as <strong>{title}</strong>. Viewers in this app will see the stream after you publish the recording.</p>
          <button className="studio-upload-btn" type="button" onClick={onUploadClick}>Upload recording</button>
        </div>
      )}
    </section>
  )
}

export function StudioCustomization() {
  const [profile, setProfile] = useState(() => loadChannelProfile(readActiveUser()))
  const [saved, setSaved] = useState('')
  function save(event) {
    event.preventDefault()
    saveChannelProfile(profile)
    setSaved('Channel branding updated')
  }
  return (
    <section className="studio-panel">
      <h1>Customization</h1>
      <form className="account-form" onSubmit={save}>
        <label>Name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
        <label>Handle<input value={profile.handle} onChange={(event) => setProfile({ ...profile, handle: event.target.value })} /></label>
        <label>Description<textarea rows="5" value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} /></label>
        <button className="studio-upload-btn" type="submit">Publish</button>
      </form>
      {saved && <p className="account-hint">{saved}</p>}
    </section>
  )
}

export function StudioSettings() {
  const [prefs, setPrefs] = useState(loadPrefs)
  return (
    <section className="studio-panel">
      <h1>Settings</h1>
      <label className="account-field check">
        <input type="checkbox" checked={prefs.restricted} onChange={(event) => setPrefs(savePrefs({ restricted: event.target.checked }))} />
        Default uploads to Restricted Mode filtering
      </label>
      <p className="studio-muted">Language and appearance still live in the account menu.</p>
    </section>
  )
}

export function StudioFeedback() {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  function send(event) {
    event.preventDefault()
    const entries = JSON.parse(localStorage.getItem('yt-feedback') || '[]')
    localStorage.setItem('yt-feedback', JSON.stringify([{ text, at: new Date().toISOString(), source: 'studio' }, ...entries].slice(0, 20)))
    setSaved('Thanks. Studio feedback was saved in this app.')
    setText('')
  }
  return (
    <section className="studio-panel">
      <h1>Send feedback</h1>
      <form className="account-form" onSubmit={send}>
        <label>Describe your Studio issue<textarea required rows="6" value={text} onChange={(event) => setText(event.target.value)} /></label>
        <button className="studio-upload-btn" type="submit">Send</button>
      </form>
      {saved && <p className="account-hint">{saved}</p>}
    </section>
  )
}
