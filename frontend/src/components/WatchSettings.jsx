import { QUALITY_LADDER, qualityLabel } from '../utils/abr'

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function WatchSettings({ panel, setPanel, speed, quality, activeQuality, captions, onSpeed, onQuality, onCaptions, category }) {
  if (panel === 'speed') {
    return SPEEDS.map((rate) => (
      <button key={rate} type="button" className={speed === rate ? 'on' : ''} onClick={() => { onSpeed(rate); setPanel('main') }}>{rate === 1 ? 'Normal' : `${rate}`}</button>
    ))
  }
  if (panel === 'captions') {
    return (
      <>
        <button type="button" className={!captions ? 'on' : ''} onClick={() => { onCaptions(false); setPanel('main') }}>Off</button>
        <button type="button" className={captions ? 'on' : ''} onClick={() => { onCaptions(true); setPanel('main') }}>English</button>
      </>
    )
  }
  if (panel === 'quality') {
    return (
      <>
        <button type="button" className={quality === 'auto' ? 'on' : ''} onClick={() => { onQuality('auto'); setPanel('main') }}>Auto {quality === 'auto' ? qualityLabel(activeQuality) : ''}</button>
        {QUALITY_LADDER.map((item) => (
          <button key={item.id} type="button" className={quality === item.id ? 'on' : ''} onClick={() => { onQuality(item.id); setPanel('main') }}>{item.label}</button>
        ))}
      </>
    )
  }
  return (
    <>
      <button type="button" onClick={() => setPanel('captions')}>Captions <span>{captions ? 'English' : 'Off'}</span></button>
      <button type="button" onClick={() => setPanel('speed')}>Playback speed <span>{speed === 1 ? 'Normal' : `${speed}x`}</span></button>
      <button type="button" onClick={() => setPanel('quality')}>Quality <span>{quality === 'auto' ? `Auto · ${qualityLabel(activeQuality)}` : qualityLabel(quality)}</span></button>
      {category ? <p className="player-cat">Category · {category}</p> : null}
    </>
  )
}

export default WatchSettings
