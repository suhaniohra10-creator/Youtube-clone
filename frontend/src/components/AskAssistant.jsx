import { Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import axios from 'axios'
import { API } from '../config'

function AskAssistant({ video }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  async function ask() {
    const text = question.trim()
    if (!text || loading) return
    setQuestion('')
    setMessages((items) => [...items, { role: 'user', text }])
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/ai/ask`, {
        question: text,
        video_id: video?.id,
        title: video?.title,
        description: video?.description,
        category: video?.category,
        duration: video?.duration_seconds ? `${video.duration_seconds}s` : video?.duration,
      })
      setMessages((items) => [...items, { role: 'assistant', text: data.answer }])
    } catch (error) {
      const fallback = error.response?.data?.detail || `I can still help locally: ${video?.title} is a ${video?.category || ''} video. ${video?.description || ''}`.trim()
      setMessages((items) => [...items, { role: 'assistant', text: fallback || 'The assistant is unavailable right now.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ask-box" id="ask-assistant">
      <h3><Sparkles size={16} /> ASK</h3>
      <p>Ask about this video’s topic, length, or what to watch next.</p>
      <div className="ask-thread">
        {messages.length === 0 && <small>Try “summarize this video” or “how long is it?”</small>}
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={message.role}>
            <b>{message.role === 'user' ? 'You' : 'Assistant'}</b>
            <span>{message.text}</span>
          </article>
        ))}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); ask() }}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about this video" />
        <button type="submit" disabled={!question.trim() || loading}>{loading ? '…' : <Send size={16} />}</button>
      </form>
    </section>
  )
}

export default AskAssistant
