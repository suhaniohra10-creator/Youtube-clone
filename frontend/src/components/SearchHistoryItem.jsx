import { Clock3, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

const HOLD_MS = 500

function SearchHistoryItem({ item, onSearch, onRemove }) {
  const { t } = useI18n()
  const [confirm, setConfirm] = useState(false)
  const heldRef = useRef(false)
  const timerRef = useRef(null)

  function clearHold() {
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => () => clearHold(), [])

  function startHold(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    heldRef.current = false
    clearHold()
    timerRef.current = window.setTimeout(() => {
      heldRef.current = true
      setConfirm(true)
    }, HOLD_MS)
  }

  function onClick(event) {
    if (heldRef.current || confirm) {
      event.preventDefault()
      heldRef.current = false
      return
    }
    onSearch(item.query)
  }

  function openConfirm(event) {
    event.preventDefault()
    event.stopPropagation()
    clearHold()
    setConfirm(true)
  }

  if (confirm) {
    return (
      <div className="search-history-confirm" role="alertdialog" aria-label={t('removeFromSearchHistory')}>
        <p>{t('removeFromSearchHistory')}</p>
        <button type="button" className="confirm-yes" onClick={() => onRemove(item)}>{t('remove')}</button>
        <button type="button" onClick={() => setConfirm(false)}>{t('cancel')}</button>
      </div>
    )
  }

  return (
    <div className="search-history-item">
      <button
        type="button"
        className="search-history-query"
        onClick={onClick}
        onPointerDown={startHold}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onPointerLeave={(event) => { if (event.pointerType === 'mouse') clearHold() }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Clock3 size={16} />
        <span><b>{item.query}</b></span>
      </button>
      <button
        type="button"
        className="search-history-clear"
        aria-label={t('removeFromSearchHistory')}
        onClick={openConfirm}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default SearchHistoryItem
