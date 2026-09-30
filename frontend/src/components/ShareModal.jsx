import { ChevronLeft, ChevronRight, Code2, Mail, MessageCircle, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadCommunityPosts, saveCommunityPosts } from '../utils/studio'
import { isOwnUpload, formatClock, getVideoId, watchLink } from '../utils/video'
import { channelSubscriberCount } from '../utils/account'

function parseStamp(value) {
  const parts = String(value || '0:00').split(':').map((part) => Number(part) || 0)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

function embedSrc(video, start) {
  const id = getVideoId(video)
  if (String(id).startsWith('local-') || video?.uploaded) return watchLink(video, start)
  return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`
}

function ShareModal({ video, title, url, onClose, onCopied }) {
  const navigate = useNavigate()
  const rowRef = useRef(null)
  const [startOn, setStartOn] = useState(false)
  const [stamp, setStamp] = useState('0:00')
  const [status, setStatus] = useState('')
  const start = startOn ? parseStamp(stamp) : 0
  const heading = title || video?.title || 'Video'
  const shareUrl = useMemo(() => (video ? watchLink(video, start) : url), [video, start, url])
  const text = `${heading} ${shareUrl}`
  const encoded = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(shareUrl)
  const subscriberCount = isOwnUpload(video) ? channelSubscriberCount() : (Number(video?.subscribers) || 0)
  const subscribers = subscriberCount ? `${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}` : 'No subscribers'

  function note(message) {
    setStatus(message)
    onCopied?.(message)
  }

  function copyText(value, message) {
    navigator.clipboard?.writeText(value).then(() => note(message)).catch(() => note('Could not copy'))
  }

  function createPost() {
    saveCommunityPosts([{ id: Date.now(), text: `Watch: ${heading}\n${shareUrl}`, at: new Date().toLocaleString() }, ...loadCommunityPosts()])
    onClose()
    navigate('/studio/community')
  }

  const targets = [
    { id: 'embed', label: 'Embed', className: 'share-embed', icon: <Code2 size={22} />, action: () => copyText(`<iframe width="560" height="315" src="${embedSrc(video, start)}" title="${heading}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`, 'Embed code copied') },
    { id: 'messages', label: 'Messages', className: 'share-messages', icon: <MessageCircle size={22} />, href: `sms:?body=${encoded}`, action: () => copyText(shareUrl, 'Link copied for Messages') },
    { id: 'whatsapp', label: 'WhatsApp', className: 'share-wa', mark: 'W', href: `https://wa.me/?text=${encoded}` },
    { id: 'facebook', label: 'Facebook', className: 'share-fb', mark: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { id: 'x', label: 'X', className: 'share-x', mark: 'X', href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(heading)}` },
    { id: 'email', label: 'Email', className: 'share-email', icon: <Mail size={22} />, href: `mailto:?subject=${encodeURIComponent(heading)}&body=${encoded}` },
  ]

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="share-modal yt-share" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header>
          <h2 id="share-title">Share in a post</h2>
          <button className="icon-button" type="button" aria-label="Close share dialog" onClick={onClose}><X size={20} /></button>
        </header>
        <button className="share-create-post" type="button" onClick={createPost}>Create post</button>
        <p className="share-subs">{subscribers}</p>
        <hr />
        <h3>Share</h3>
        <div className="share-row-wrap">
          <button className="share-scroll" type="button" aria-label="Previous" onClick={() => rowRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}><ChevronLeft size={18} /></button>
          <div className="share-row" ref={rowRef}>
            {targets.map((item) => {
              const inner = (
                <>
                  <span className={`share-orb ${item.className}`}>{item.icon || item.mark}</span>
                  {item.label}
                </>
              )
              return item.href ? (
                <a key={item.id} className="share-target" href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" onClick={item.action}>
                  {inner}
                </a>
              ) : (
                <button key={item.id} className="share-target" type="button" onClick={item.action}>{inner}</button>
              )
            })}
          </div>
          <button className="share-scroll" type="button" aria-label="Next" onClick={() => rowRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}><ChevronRight size={18} /></button>
        </div>
        <div className="share-link-row">
          <input readOnly value={shareUrl} onFocus={(event) => event.target.select()} />
          <button type="button" onClick={() => copyText(shareUrl, 'Link copied')}>Copy</button>
        </div>
        {status && <p className="share-status">{status}</p>}
        <hr />
        <label className="share-start">
          <input type="checkbox" checked={startOn} onChange={(event) => setStartOn(event.target.checked)} />
          Start at
          <input
            className="share-time"
            value={stamp}
            disabled={!startOn}
            onChange={(event) => setStamp(event.target.value)}
            onBlur={() => setStamp(formatClock(parseStamp(stamp)))}
          />
        </label>
      </section>
    </div>
  )
}

export default ShareModal
