import { useEffect, useState } from 'react'
import VideoCard from '../components/VideoCard'
import { loadChannelProfile, loadChannelSubscribers, readActiveUser, saveChannelProfile } from '../utils/account'
import { useI18n } from '../i18n'
import { getVideoId } from '../utils/video'

function ChannelPage({ catalog, open, onDownloaded, onUploadClick }) {
  const { t } = useI18n()
  const [profile, setProfile] = useState(() => loadChannelProfile(readActiveUser()))
  const [subscribers, setSubscribers] = useState(loadChannelSubscribers)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const videos = catalog.filter((item) => item.uploaded || item.file_id || String(item.id).startsWith('local-') || item.owner_id)

  useEffect(() => {
    function refresh() {
      const nextUser = readActiveUser()
      setProfile(loadChannelProfile(nextUser))
      setSubscribers(loadChannelSubscribers())
    }
    window.addEventListener('yt-account-change', refresh)
    return () => window.removeEventListener('yt-account-change', refresh)
  }, [])

  function save() {
    const next = saveChannelProfile(draft)
    setProfile(next)
    setEditing(false)
  }

  return (
    <section className="library-page">
      <div className="channel-hero">
        {profile.picture ? <img src={profile.picture} alt="" /> : <div className="channel-avatar large">{(profile.name || 'Y')[0]}</div>}
        <div>
          <h1>{profile.name}</h1>
          <p>{profile.handle} · {subscribers.length} {subscribers.length === 1 ? 'subscriber' : 'subscribers'} · {videos.length} {t('videos')}</p>
          <p className="section-kicker">{profile.description}</p>
          {subscribers.length ? (
            <p className="channel-follower-names">{subscribers.map((item) => item.handle || item.name).join(', ')}</p>
          ) : null}
          <div className="card-actions">
            <button type="button" onClick={() => { setDraft(profile); setEditing(true) }}>{t('customizeChannel')}</button>
            <button type="button" onClick={onUploadClick}>{t('uploadVideo')}</button>
          </div>
        </div>
      </div>
      {editing && (
        <form className="account-form" onSubmit={(event) => { event.preventDefault(); save() }}>
          <label>{t('channelName')}<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>{t('handle')}<input value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: event.target.value })} /></label>
          <label>{t('description')}<textarea rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <div className="card-actions">
            <button type="submit">{t('save')}</button>
            <button type="button" onClick={() => setEditing(false)}>{t('cancel')}</button>
          </div>
        </form>
      )}
      <h2>{t('videos')}</h2>
      {videos.length ? (
        <div className="video-grid">
          {videos.map((video) => <VideoCard key={getVideoId(video)} video={video} onOpen={open} onDownloaded={onDownloaded} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t('firstVideo')}</h2>
          <p>{t('uploadAppear')}</p>
          <button className="create-button" type="button" onClick={onUploadClick}>{t('uploadVideo')}</button>
        </div>
      )}
    </section>
  )
}

export default ChannelPage
