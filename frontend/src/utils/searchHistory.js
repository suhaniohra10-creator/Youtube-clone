import axios from 'axios'
import { API, RECENT_SEARCHES } from '../config'
import { load } from './video'

const STORAGE_KEY = 'yt-search-history'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function localHistoryId(query) {
  return `local-${encodeURIComponent(String(query || '').trim().toLowerCase())}`
}

export function normalizeHistory(items) {
  const seen = new Set()
  const next = []
  for (const item of items || []) {
    const query = String(typeof item === 'string' ? item : item?.query || '').trim()
    const id = String(typeof item === 'string' ? localHistoryId(query) : item?.id || localHistoryId(query))
    const key = query.toLowerCase()
    if (!query || seen.has(key)) continue
    seen.add(key)
    next.push({ id, query })
  }
  return next.slice(0, 8)
}

export function readLocalHistory() {
  return normalizeHistory(load(STORAGE_KEY, RECENT_SEARCHES))
}

function writeLocalHistory(items) {
  const next = normalizeHistory(items)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export async function fetchSearchHistory() {
  const headers = authHeaders()
  if (!headers.Authorization) return readLocalHistory()
  try {
    const { data } = await axios.get(`${API}/search/history`, { headers })
    return writeLocalHistory(data)
  } catch {
    return readLocalHistory()
  }
}

export async function rememberSearch(query, current = []) {
  const text = String(query || '').trim()
  if (!text) return normalizeHistory(current)
  const optimistic = writeLocalHistory([{ id: localHistoryId(text), query: text }, ...current])
  const headers = authHeaders()
  if (!headers.Authorization) return optimistic
  try {
    const { data } = await axios.post(`${API}/search/history`, { query: text }, { headers })
    return writeLocalHistory([data, ...current])
  } catch {
    return optimistic
  }
}

export async function removeSearchHistory(item, current = []) {
  const id = String(item?.id || '')
  const query = String(item?.query || '').trim().toLowerCase()
  const next = writeLocalHistory(current.filter((row) => row.id !== id && row.query.toLowerCase() !== query))
  const headers = authHeaders()
  if (!headers.Authorization || !id || id.startsWith('local-')) return next
  try {
    await axios.delete(`${API}/search/history/${encodeURIComponent(id)}`, { headers })
  } catch (error) {
    if (error.response?.status && error.response.status !== 401 && error.response.status !== 404) {
      return next
    }
  }
  return next
}
