import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { BadgeCheck, BellRing, Bookmark, Clock3, Copy, Download, MoreHorizontal, Share2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import AskAssistant from '../components/AskAssistant'
import { CommentBlock, commentCount, patchComment } from '../components/CommentThread'
import { PreviewVideo, useHoverPreview } from '../components/HoverPreview'
import WatchPlayer from '../components/WatchPlayer'
import ShareModal from '../components/ShareModal'
import { API } from '../config'
import { loadComments } from '../data/comments'
import { compact, copyWatchLink, displayAge, downloadMedia, durationLabel, formatViews, getVideoId, isOwnUpload, matchesQuery, normalize, rememberDownload } from '../utils/video'
import { authHeaders, loadResumeTime } from '../utils/watchProgress'
import { addChannelSubscriber, channelSubscriberCount, isChannelOwner, readActiveUser, removeChannelSubscriber } from '../utils/account'
import { channelPath } from '../utils/channelLink'
import { useI18n } from '../i18n'

function watchTopic(video) {
  const text = `${video?.category || ''} ${video?.title || ''}`.toLowerCase()
  if (/(music|song|lyrical|singer|album|mashup)/.test(text)) return 'Music'
  if (/(tutorial|python|programming|tech|coding|machine)/.test(text)) return 'Tech'
  if (/(movie|trailer|cinema|film)/.test(text)) return 'Movies'
  if (/(standup|comedy|funny)/.test(text)) return 'Comedy'
  return video?.category || 'All'
}

function featuredArtist(video) {
  const hit = String(video?.title || '').match(/\b(?:ft\.?|feat\.?|&)\s+([A-Za-z][A-Za-z .']{1,28})/)
  const name = hit?.[1]?.replace(/\s*[|\-–(].*$/, '').trim() || ''
  return name && name.toLowerCase() !== String(video?.channel_name || '').toLowerCase() ? name : ''
}

function localRecommendations(catalog, videoId, video) {
  const topic = watchTopic(video)
  return catalog
    .filter((item) => getVideoId(item) !== videoId)
    .sort((left, right) => {
      const leftHit = watchTopic(left) === topic || left.category === video?.category || matchesQuery(left, topic)
      const rightHit = watchTopic(right) === topic || right.category === video?.category || matchesQuery(right, topic)
      return Number(rightHit) - Number(leftHit)
    })
    .slice(0, 12)
}

function RecCard({ item, onOpen, t }) {
  const preview = useHoverPreview()
  const navigate = useNavigate()
  return (
    <button onClick={() => onOpen(item)} {...preview.bind}>
      <span className="rec-thumb">
        <img src={item.thumbnail_url} alt="" />
        <PreviewVideo video={item} active={preview.active} onEnded={preview.stop} />
        <em>{durationLabel(item)}</em>
      </span>
      <span>
        <b>{item.title}</b>
        <small><span className="video-channel-link" onClick={(event) => { event.stopPropagation(); navigate(channelPath(item)) }}>{item.channel_name}</span><br />{formatViews(item.views, t('views'))} · {displayAge(item) || t('recently')}</small>
      </span>
    </button>
  )
}

function WatchPage({
  catalog, setCatalog, likes, dislikes, saved, later, subscriptions, react, toggle,
  setSaved, setLater, setSubscriptions, setDownloads, open,
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState(() => catalog.find((item) => getVideoId(item) === id))
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState(() => loadComments(id, catalog.find((item) => getVideoId(item) === id) || { id }))
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [replyText, setReplyText] = useState('')
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [theater, setTheater] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  function toggleAsk() {
    setAskOpen((value) => !value)
    window.setTimeout(() => document.getElementById('ask-assistant')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }
  const [downloading, setDownloading] = useState(false)
  const [recs, setRecs] = useState(() => localRecommendations(catalog, id, catalog.find((item) => getVideoId(item) === id)))
  const [resumeAt, setResumeAt] = useState(0)
  const { t } = useI18n()

  useEffect(() => {
    const fallback = catalog.find((item) => getVideoId(item) === id)
    if (fallback) setVideo(fallback)
    setComments(loadComments(id, fallback || { id }))
    const mongoId = /^[a-f0-9]{24}$/i.test(String(id))
    if (String(id).startsWith('local-')) return
    if (mongoId || fallback?.uploaded || fallback?.file_id) {
      axios.get(`${API}/videos/${id}`, { headers: authHeaders() }).then(({ data }) => {
        const fresh = normalize({ ...fallback, ...data, uploaded: Boolean(data.file_id || fallback?.uploaded), file_id: data.file_id || fallback?.file_id })
        setVideo(fresh)
        setComments(loadComments(id, fresh))
        setCatalog((all) => [fresh, ...all.filter((item) => getVideoId(item) !== id)])
      }).catch((error) => {
        if (!fallback) setNotice(error.response?.data?.detail || error.message || 'Could not load video')
      })
      axios.post(`${API}/videos/${id}/view`).then(({ data }) => {
        setVideo((current) => normalize({
          ...current,
          ...data,
          lastWatchedTime: current?.lastWatchedTime,
          uploaded: current?.uploaded || Boolean(data.file_id),
          file_id: data.file_id || current?.file_id,
        }))
      }).catch((error) => {
        if (error.response?.status && error.response.status !== 404) setNotice('Could not update views')
      })
      return
    }
    axios.get(`${API}/youtube/videos/${id}`).then(({ data }) => {
      const fresh = normalize(data)
      setVideo((current) => ({ ...current, ...fresh, preview_url: current?.preview_url || fresh.preview_url }))
      setComments(loadComments(id, fresh))
      setCatalog((all) => [fresh, ...all.filter((item) => getVideoId(item) !== id)])
    }).catch((error) => {
      if (!fallback) setNotice(error.message || 'Could not load live video metadata')
    })
  }, [id])

  const [channelInfo, setChannelInfo] = useState(null)
  const channelRef = video?.channel_id || video?.channelId || ''
  const isYouTubeVideo = /^[\w-]{11}$/.test(String(id)) && !video?.uploaded

  // Real author profile (avatar, handle, subscribers, verification), refreshed on every load
  useEffect(() => {
    setChannelInfo(null)
    if (!channelRef || !isYouTubeVideo) return undefined
    let stale = false
    axios.get(`${API}/youtube/channels/${encodeURIComponent(channelRef)}`, { timeout: 15000 })
      .then(({ data }) => { if (!stale) setChannelInfo(data) })
      .catch(() => {})
    return () => { stale = true }
  }, [channelRef, isYouTubeVideo])

  // Real comments + commenter avatars from the YouTube Data API
  useEffect(() => {
    if (!isYouTubeVideo) return undefined
    let stale = false
    axios.get(`${API}/youtube/comments/${id}`, { timeout: 15000 })
      .then(({ data }) => { if (!stale && data?.length) setComments(data) })
      .catch(() => {})
    return () => { stale = true }
  }, [id, isYouTubeVideo])

  useEffect(() => {
    localStorage.setItem(`yt-comments-${id}`, JSON.stringify(comments))
  }, [comments, id])

  useEffect(() => {
    const fallback = localRecommendations(catalog, id, video)
    setRecs(fallback)
    if (/^[a-f0-9]{24}$/i.test(String(id)) || String(id).startsWith('local-') || video?.uploaded || video?.file_id) return
    axios.get(`${API}/youtube/related`, {
      params: { video_id: id, category: video?.category || '', q: video?.title || '', max_results: 12 },
      timeout: 10000,
    }).then(({ data }) => {
      if (!data?.length) return
      setRecs(data.map((item) => normalize(item)).filter((item) => getVideoId(item) !== id))
    }).catch(() => {
      setRecs(fallback)
    })
  }, [id, video?.category, video?.title, video?.uploaded, video?.file_id])

  useEffect(() => {
    let cancelled = false
    loadResumeTime(id, video?.lastWatchedTime).then((time) => {
      if (!cancelled) setResumeAt(time)
    })
    return () => { cancelled = true }
  }, [id, video?.lastWatchedTime])

  function tell(text) {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 2400)
  }

  function addComment() {
    if (!comment.trim()) return
    setComments((items) => [{
      id: `${id}-you-${Date.now()}`, name: 'You', handle: 'you', avatar: '', text: comment.trim(), age: 'now', likes: 0, replies: [],
    }, ...items])
    setComment('')
  }

  function toggleCommentLike(commentId) {
    setComments((items) => patchComment(items, commentId, (item) => (
      item.liked
        ? { ...item, liked: false, likes: Math.max(0, (item.likes || 0) - 1) }
        : { ...item, liked: true, disliked: false, likes: (item.likes || 0) + 1 }
    )))
  }

  function toggleCommentDislike(commentId) {
    setComments((items) => patchComment(items, commentId, (item) => (
      item.disliked
        ? { ...item, disliked: false }
        : { ...item, disliked: true, liked: false, likes: item.liked ? Math.max(0, (item.likes || 0) - 1) : (item.likes || 0) }
    )))
  }

  function addReply(parentId) {
    if (!replyText.trim()) return
    const reply = { id: `${parentId}-you-${Date.now()}`, name: 'You', handle: 'you', avatar: '', text: replyText.trim(), age: 'now', likes: 0 }
    setComments((items) => items.map((item) => (item.id === parentId ? { ...item, replies: [...(item.replies || []), reply] } : item)))
    setReplyText('')
    setReplyTo('')
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadMedia(video, API)
      rememberDownload(id)
      toggle(setDownloads, id)
      tell('Download saved to your device')
    } catch (error) {
      tell(error.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  if (!video) return <p className="empty-state">{t('loading')}</p>
  const startAt = resumeAt
  const mine = isOwnUpload(video, id)
  const owner = mine && isChannelOwner(video)
  const subscriberCount = mine ? channelSubscriberCount() : (Number(video.subscribers) || 0)
  const likeCount = (Number(video.likes) || 0) + (likes.includes(id) ? 1 : 0)
  const subscribed = subscriptions.includes(video.channel_name)
  const artist = featuredArtist(video)
  const savedHere = saved.includes(id)
  const handle = mine ? '' : (video.channel_handle || '')

  function onSubscribe() {
    if (owner) {
      navigate('/channel')
      return
    }
    if (mine) {
      const user = readActiveUser()
      if (!user) {
        tell('Sign in with Google to subscribe with your YouTube username')
        return
      }
      if (subscribed) removeChannelSubscriber(user)
      else addChannelSubscriber(user)
    }
    toggle(setSubscriptions, video.channel_name)
    tell(subscribed ? 'Unsubscribed' : 'Subscribed')
  }

  return (
    <div className={`watch-page ${theater ? 'watch-theater' : ''}`}>
      <section className="watch-main">
        <WatchPlayer
          key={id}
          video={video}
          startAt={startAt}
          theater={theater}
          onTheater={() => setTheater((value) => !value)}
          onNext={() => recs[0] && open(recs[0])}
        />
        <h1>{video.title}</h1>
        <div className="channel-row">
          <div className="watch-channel">
            <button type="button" className="watch-channel-link" aria-label="Open channel" onClick={() => navigate(channelPath(channelInfo ? { channel_id: channelInfo.id } : video))}>
              {(channelInfo?.avatar || video.channel_avatar) ? <img src={channelInfo?.avatar || video.channel_avatar} alt="" /> : <span className="channel-avatar">{(video.channel_name || 'C')[0].toUpperCase()}</span>}
            </button>
            <div>
              <strong className="video-channel-link" onClick={() => navigate(channelPath(channelInfo ? { channel_id: channelInfo.id } : video))}>
                {channelInfo?.name || video.channel_name || 'Channel'}
                {!mine && channelInfo?.verified === true && <BadgeCheck size={16} className="yt-verified" aria-label="Verified" />}
                {artist ? <em> and {artist}</em> : null}
              </strong>
              <small>
                {channelInfo ? [channelInfo.handle, channelInfo.subscribers].filter(Boolean).join(' · ') : (
                  <>
                    {handle ? `${handle} · ` : ''}
                    {subscriberCount ? `${compact(subscriberCount)} subscriber${subscriberCount === 1 ? '' : 's'}` : '0 subscribers'}
                  </>
                )}
              </small>
            </div>
          </div>
          <div className="subscribe-group">
            {owner ? (
              <button className="subscribe subscribed" type="button" onClick={() => navigate('/channel')}>Customize channel</button>
            ) : (
              <button className={`subscribe ${subscribed ? 'subscribed' : ''}`} type="button" onClick={onSubscribe}>
                {subscribed ? t('subscribed') : t('subscribe')}
              </button>
            )}
            {subscribed && !owner && <button className="notify-bell" type="button" aria-label="Notifications" onClick={() => tell('You’ll be notified about this channel in this app')}><BellRing size={18} /></button>}
          </div>
          <div className="watch-actions">
            <div className="react-group">
              <button className={likes.includes(id) ? 'selected' : ''} type="button" onClick={() => react(id, 'like')}><ThumbsUp size={18} fill={likes.includes(id) ? 'currentColor' : 'none'} /> {compact(likeCount)}</button>
              <span className="react-split" />
              <button className={dislikes.includes(id) ? 'selected' : ''} type="button" onClick={() => react(id, 'dislike')}><ThumbsDown size={18} fill={dislikes.includes(id) ? 'currentColor' : 'none'} /></button>
            </div>
            <button type="button" onClick={() => setShareOpen(true)}><Share2 size={18} /> {t('share')}</button>
            <button className={askOpen ? 'selected' : ''} type="button" onClick={toggleAsk}><Sparkles size={18} /> Ask</button>
            <button className={savedHere ? 'selected' : ''} type="button" onClick={() => { toggle(setSaved, id); tell(savedHere ? 'Removed from playlist' : 'Saved to playlist') }}><Bookmark size={18} fill={savedHere ? 'currentColor' : 'none'} /> Save</button>
            <button type="button" onClick={() => setMenu((value) => !value)}><MoreHorizontal size={20} /></button>
            {menu && (
              <div className="action-menu">
                <button type="button" onClick={() => { toggle(setLater, id); tell(later.includes(id) ? 'Removed from Watch later' : 'Added to Watch later') }}><Clock3 size={17} /> {later.includes(id) ? 'Remove from Watch later' : 'Save to Watch later'}</button>
                <button type="button" onClick={() => copyWatchLink(video).then(() => tell('Link copied')).catch((error) => tell(error.message || 'Could not copy link'))}><Copy size={17} /> {t('copy')}</button>
                <button type="button" disabled={downloading} onClick={handleDownload}><Download size={17} /> {downloading ? t('saving') : t('download')}</button>
              </div>
            )}
          </div>
        </div>
        <div className="description">
          <b>{formatViews(video.views, t('views'))} · {displayAge(video) || t('recently')} · {durationLabel(video)}</b>
          <p className={expanded ? '' : 'clamp'}>{video.description || 'Enjoy this video and subscribe for more.'} #youtube #video</p>
          <button onClick={() => setExpanded((value) => !value)}>{expanded ? t('showLess') : t('more')}</button>
        </div>
        {askOpen && <AskAssistant video={video} />}
        <section className="comments">
          <div className="comment-heading"><h2>{commentCount(comments)} {t('comments')}</h2></div>
          <div className="add-comment">
            <span>Y</span>
            <input value={comment} placeholder={t('addComment')} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addComment()} />
            <button disabled={!comment.trim()} onClick={addComment}>{t('comment')}</button>
          </div>
          <div className="comment-list">
            {comments.map((item) => (
              <CommentBlock
                key={item.id || `${item.name}-${item.text}`}
                item={item}
                replyTo={replyTo}
                replyText={replyText}
                setReplyTo={setReplyTo}
                setReplyText={setReplyText}
                onLike={toggleCommentLike}
                onDislike={toggleCommentDislike}
                onReply={addReply}
              />
            ))}
          </div>
        </section>
      </section>
      <aside className="recommendations">
        <h2>Recommended</h2>
        {recs.map((item) => (
          <RecCard key={getVideoId(item)} item={item} onOpen={open} t={t} />
        ))}
      </aside>
      {shareOpen && <ShareModal video={video} onClose={() => setShareOpen(false)} onCopied={tell} />}
      {notice && <div className="toast">{notice}</div>}
    </div>
  )
}

export default WatchPage
