import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import ChipSlider from '../components/ChipSlider'
import VideoCard from '../components/VideoCard'
import { API, HOME_CHIPS } from '../config'
import { getVideoId, matchesQuery, mergeCatalog, normalize } from '../utils/video'
import { useI18n } from '../i18n'

const PAGE_SIZE = 24

function loadTopicVideos(topic) {
  return axios.get(`${API}/youtube/explore`, {
    params: { category: topic, max_results: PAGE_SIZE },
    timeout: 15000,
  }).then(({ data }) => {
    const items = (data || []).map((item) => normalize(item))
    if (items.length) return items
    return axios.get(`${API}/search`, { params: { q: topic }, timeout: 15000 })
      .then(({ data: searchData }) => (searchData || []).map((item) => normalize(item)))
  }).catch(() => axios.get(`${API}/search`, { params: { q: topic }, timeout: 15000 })
    .then(({ data }) => (data || []).map((item) => normalize(item))))
}

function CategoryPage({ catalog, open, onDownloaded, setCategory }) {
  const { t } = useI18n()
  const { name = 'Music' } = useParams()
  const topic = decodeURIComponent(name)
  const [remote, setRemote] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadTopicVideos(topic)
      .then((items) => {
        if (!cancelled) setRemote(items || [])
      })
      .catch(() => {
        if (!cancelled) setRemote([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [topic])

  const localHits = catalog.filter((item) => matchesQuery(item, topic))
  const videos = mergeCatalog(remote, localHits).slice(0, 30)

  return (
    <section className="category-page">
      <ChipSlider items={HOME_CHIPS} active={topic} onSelect={setCategory} />
      <div className="search-banner">
        <h2>{topic}</h2>
        <p>{t('videosFor')} “{topic}” {t('stayInApp')}</p>
      </div>
      {loading && !videos.length ? (
        <div className="empty-state">
          <h2>{t('loadingTopic')}</h2>
          <p>{t('fetchingAbout')}</p>
        </div>
      ) : videos.length ? (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard key={getVideoId(video)} video={video} onOpen={open} onDownloaded={onDownloaded} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t('noVideos')}</h2>
          <p>{t('tryAnotherTopic')}</p>
        </div>
      )}
    </section>
  )
}

export default CategoryPage
