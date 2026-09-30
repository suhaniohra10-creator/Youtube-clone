import { useMemo, useState } from 'react'
import axios from 'axios'
import { API } from '../config'
import { displayAge, getVideoId, load } from '../utils/video'
import { useI18n } from '../i18n'

function StudioPage({ catalog, open, onUploadClick }) {
  const { t } = useI18n()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const uploads = useMemo(() => {
    const local = load('yt-uploads', [])
    return [...local, ...catalog.filter((item) => item.uploaded || item.owner_id || String(item.id).startsWith('local-'))]
      .filter((item, index, list) => list.findIndex((entry) => getVideoId(entry) === getVideoId(item)) === index)
  }, [catalog])

  async function removeVideo(video) {
    const id = getVideoId(video)
    setBusy(id)
    try {
      const token = localStorage.getItem('access_token')
      if (token && /^[a-f0-9]{24}$/i.test(String(id))) {
        await axios.delete(`${API}/videos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      }
      const remaining = load('yt-uploads', []).filter((item) => getVideoId(item) !== id)
      localStorage.setItem('yt-uploads', JSON.stringify(remaining))
      setNotice('Video removed from Studio')
    } catch (error) {
      setNotice(error.response?.data?.detail || 'Could not delete this video')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="account-page">
      <header className="account-hero">
        <div>
          <h1>{t('youtubeStudio')}</h1>
          <p>{t('studioHint')}</p>
        </div>
        <button className="create-button" type="button" onClick={onUploadClick}>{t('uploadVideo')}</button>
      </header>
      <div className="studio-stats">
        <article><b>{uploads.length}</b><span>{t('videos')}</span></article>
        <article><b>{uploads.reduce((sum, item) => sum + (Number(item.views) || 0), 0)}</b><span>{t('views')}</span></article>
        <article><b>{uploads.reduce((sum, item) => sum + (Number(item.likes) || 0), 0)}</b><span>{t('likes')}</span></article>
      </div>
      {notice && <p className="account-hint">{notice}</p>}
      {uploads.length ? (
        <div className="studio-table">
          {uploads.map((video) => (
            <article key={getVideoId(video)}>
              <button type="button" onClick={() => open(video)}>
                <img src={video.thumbnail_url} alt="" />
              </button>
              <div>
                <strong>{video.title}</strong>
                <small>{video.views || 0} {t('views')} · {displayAge(video)} · {video.category || 'All'}</small>
              </div>
              <button type="button" onClick={() => open(video)}>{t('view')}</button>
              <button type="button" disabled={busy === getVideoId(video)} onClick={() => removeVideo(video)}>{t('delete')}</button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t('noContent')}</h2>
          <p>{t('uploadToSee')}</p>
        </div>
      )}
    </section>
  )
}

export default StudioPage
