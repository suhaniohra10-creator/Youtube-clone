import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function ChipSlider({ items, active, onSelect }) {
  const trackRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  function updateArrows() {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setCanLeft(track.scrollLeft > 8)
    setCanRight(track.scrollLeft < max - 8)
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    updateArrows()
    const observer = new ResizeObserver(updateArrows)
    observer.observe(track)
    track.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      observer.disconnect()
      track.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [items])

  function slide(direction) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * Math.max(240, track.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <div className="chip-slider">
      {canLeft && (
        <button className="chip-arrow chip-arrow-left" type="button" aria-label="Scroll suggestions left" onClick={() => slide(-1)}>
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="category-bar" ref={trackRef}>
        {items.map((item) => (
          <button key={item} className={`category ${item === active ? 'active' : ''}`} onClick={() => onSelect(item)}>
            {item}
          </button>
        ))}
      </div>
      {canRight && (
        <button className="chip-arrow chip-arrow-right" type="button" aria-label="Scroll suggestions right" onClick={() => slide(1)}>
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}

export default ChipSlider
