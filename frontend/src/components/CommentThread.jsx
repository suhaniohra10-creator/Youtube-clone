import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { compact } from '../utils/video'

export function commentCount(items) {
  return items.reduce((total, item) => total + 1 + (item.replies?.length || 0), 0)
}

export function patchComment(items, commentId, update) {
  return items.map((item) => {
    if (item.id === commentId) return update(item)
    if (!item.replies?.length) return item
    return { ...item, replies: item.replies.map((reply) => (reply.id === commentId ? update(reply) : reply)) }
  })
}

export function CommentBlock({ item, nested, replyTo, replyText, setReplyTo, setReplyText, onLike, onDislike, onReply }) {
  const navigate = useNavigate()
  const goAuthor = item.channel_id ? () => navigate(`/channel/${item.channel_id}`) : undefined
  return (
    <article className={nested ? 'comment-nested' : ''}>
      {item.avatar ? <img className="comment-avatar" src={item.avatar} alt="" onClick={goAuthor} style={goAuthor ? { cursor: 'pointer' } : undefined} /> : <span className="comment-avatar">{(item.name || 'U')[0]}</span>}
      <div>
        <b onClick={goAuthor} style={goAuthor ? { cursor: 'pointer' } : undefined}>{item.channel_id ? '' : '@'}{item.handle || item.name} <small>{item.age}</small></b>
        <p>{item.text}</p>
        <button className={item.liked ? 'picked' : ''} type="button" onClick={() => onLike(item.id)}>
          <ThumbsUp size={14} fill={item.liked ? 'currentColor' : 'none'} /> {item.likes ? compact(item.likes) : ''}
        </button>
        <button className={item.disliked ? 'picked' : ''} type="button" onClick={() => onDislike(item.id)}>
          <ThumbsDown size={14} fill={item.disliked ? 'currentColor' : 'none'} />
        </button>
        {!nested && <button type="button" onClick={() => { setReplyTo((current) => current === item.id ? '' : item.id); setReplyText('') }}>Reply</button>}
        {!nested && replyTo === item.id && (
          <div className="add-comment comment-reply-box">
            <input value={replyText} placeholder="Add a reply..." onChange={(event) => setReplyText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onReply(item.id)} />
            <button type="button" disabled={!replyText.trim()} onClick={() => onReply(item.id)}>Reply</button>
          </div>
        )}
        {!nested && item.replies?.length > 0 && (
          <div className="comment-replies">
            {item.replies.map((reply) => (
              <CommentBlock key={reply.id} item={reply} nested replyTo={replyTo} replyText={replyText} setReplyTo={setReplyTo} setReplyText={setReplyText} onLike={onLike} onDislike={onDislike} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
