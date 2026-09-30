import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import SearchHistoryItem from './SearchHistoryItem'
import { fetchSearchHistory, readLocalHistory, rememberSearch, removeSearchHistory } from '../utils/searchHistory'

function suggestionLists(suggestions) {
  if (Array.isArray(suggestions)) return { queries: [], videos: suggestions }
  return { queries: suggestions?.queries || [], videos: suggestions?.videos || [] }
}

function highlightMatch(text, query) {
  const needle = query.trim()
  const index = text.toLowerCase().indexOf(needle.toLowerCase())
  if (!needle || index < 0) return <b>{text}</b>
  return (
    <b>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </b>
  )
}

function SearchBar({ searchQuery, setSearchQuery, suggestions, onSearch, onSearchChange, onSearchSuggestions, onClearSuggestions, onPickVideo, children }) {
  const { t } = useI18n()
  const wrapRef = useRef(null)
  const timerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const [recents, setRecents] = useState(() => readLocalHistory())
  const { queries, videos } = suggestionLists(suggestions)
  const queryItems = searchQuery.trim()
    ? [searchQuery.trim(), ...queries.filter((item) => item.toLowerCase() !== searchQuery.trim().toLowerCase())]
    : queries

  useEffect(() => {
    fetchSearchHistory().then(setRecents)
  }, [])

  useEffect(() => {
    function close(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      window.clearTimeout(timerRef.current)
    }
  }, [])

  async function persistRecent(value) {
    const next = await rememberSearch(value, recents)
    setRecents(next)
  }

  async function removeRecent(item) {
    const next = await removeSearchHistory(item, recents)
    setRecents(next)
  }

  function applySearch(value) {
    const query = value.trim()
    if (!query) return
    setSearchQuery(query)
    persistRecent(query)
    onSearchChange?.(query)
    onSearch?.(query)
    setOpen(false)
    setActive(-1)
    onClearSuggestions?.()
  }

  function pickVideo(video) {
    persistRecent(video.title)
    setSearchQuery(video.title)
    onSearchChange?.(video.title)
    setOpen(false)
    setActive(-1)
    onClearSuggestions?.()
    onPickVideo?.(video)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (open && active >= 0 && active < queryItems.length) {
      applySearch(queryItems[active])
      return
    }
    applySearch(searchQuery)
  }

  function handleChange(event) {
    const value = event.target.value
    setSearchQuery(value)
    onSearchChange?.(value)
    setOpen(true)
    setActive(-1)
    window.clearTimeout(timerRef.current)
    const trimmed = value.trim()
    if (!trimmed) {
      setLoading(false)
      onClearSuggestions?.()
      return
    }
    setLoading(true)
    timerRef.current = window.setTimeout(() => {
      Promise.resolve(onSearchSuggestions?.(trimmed))
        .catch(() => ({ queries: [trimmed], videos: [] }))
        .finally(() => setLoading(false))
    }, 70)
  }

  function handleKeyDown(event) {
    const total = queryItems.length
    if (!open || !total) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % total)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current <= 0 ? total - 1 : current - 1))
    }
    if (event.key === 'Escape') setOpen(false)
  }

  const showRecents = open && !searchQuery.trim()
  const showPanel = open && Boolean(searchQuery.trim()) && (loading || queryItems.length > 0 || videos.length > 0)

  return (
    <form className="search-form" onSubmit={handleSubmit} ref={wrapRef}>
      <input
        id="yt-search-input"
        aria-label={t('search')}
        placeholder={t('search')}
        value={searchQuery}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
      />
      <button type="submit" aria-label={t('search')}><Search size={20} /></button>
      {children}
      {showRecents && (
        <div className="search-suggestions search-history" onWheel={(event) => event.stopPropagation()}>
          <p>{t('recentSearches')}</p>
          {recents.map((item) => (
            <SearchHistoryItem key={item.id} item={item} onSearch={applySearch} onRemove={removeRecent} />
          ))}
        </div>
      )}
      {showPanel && (
        <div className="search-suggestions" role="listbox" aria-label="Search suggestions" onWheel={(event) => event.stopPropagation()}>
          {loading && <p>{t('searching')}</p>}
          {queryItems.map((item, index) => (
            <button type="button" key={item} className={`search-query ${index === active ? 'active' : ''}`} onClick={() => applySearch(item)}>
              <Search size={16} />
              <span>{highlightMatch(item, searchQuery)}<small>{t('searchSuggestion')}</small></span>
            </button>
          ))}
          {videos.length > 0 && <p>Related videos</p>}
          {videos.map((video) => (
            <button type="button" key={video.id} onClick={() => pickVideo(video)}>
              <img src={video.thumbnail_url} alt="" />
              <span>
                {highlightMatch(video.title, searchQuery)}
                <small>{video.channel_name} · {t('watchInApp')}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  )
}

export default SearchBar
