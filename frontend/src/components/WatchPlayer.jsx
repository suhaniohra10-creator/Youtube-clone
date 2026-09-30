import { useEffect, useRef, useState } from 'react'
import PlayerIcon from './PlayerIcons'
import WatchSettings from './WatchSettings'
import { usePlaybackProgress } from '../hooks/usePlaybackProgress'
import { API } from '../config'
import { bufferSeconds, chooseQuality, initialAutoQuality, networkKbps, qualityLabel, streamWithQuality, youtubeQuality } from '../utils/abr'
import { fallbackStreamUrl, formatClock, getVideoId, resolveMediaUrl } from '../utils/video'
import { captionsFor, cueAt, isNativeVideo, loadYouTubeApi } from '../utils/watchPlayer'

function WatchPlayer({ video, startAt = 0, onNext, theater, onTheater }) {
  const native = isNativeVideo(video, getVideoId(video))
  const media = resolveMediaUrl(video, API) || video?.preview_url
  const [src, setSrc] = useState(media)
  const [playing, setPlaying] = useState(true)
  const [current, setCurrent] = useState(startAt)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem('yt-player-speed')) || 1)
  const [quality, setQuality] = useState(() => localStorage.getItem('yt-player-quality') || 'auto')
  const [abrId, setAbrId] = useState(initialAutoQuality)
  const [waiting, setWaiting] = useState(false)
  const [captions, setCaptions] = useState(false)
  const [panel, setPanel] = useState('')
  const [chrome, setChrome] = useState(true)
  const [wide, setWide] = useState(false)
  const [mini, setMini] = useState(false)
  const [hover, setHover] = useState(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [cue, setCue] = useState('')
  const [renditions, setRenditions] = useState(video?.renditions || [])
  const videoRef = useRef(null)
  const hostRef = useRef(null)
  const ytRef = useRef(null)
  const boxRef = useRef(null)
  const resumeAt = useRef(null)
  const lastSwitch = useRef(0)
  const cues = captionsFor(getVideoId(video))
  const activeQuality = quality === 'auto' ? abrId : quality
  const sourceVideo = { ...video, renditions }

  function yt() {
    return ytRef.current
  }

  function file() {
    return videoRef.current
  }

  function playToggle() {
    if (native) {
      const node = file()
      if (!node) return
      if (node.paused) node.play().catch(() => {})
      else node.pause()
      return
    }
    const player = yt()
    if (!player?.getPlayerState) return
    if (player.getPlayerState() === 1) player.pauseVideo()
    else player.playVideo()
  }

  function seekTo(time) {
    const next = Math.max(0, Math.min(duration || time, time))
    if (native && file()) file().currentTime = next
    else yt()?.seekTo?.(next, true)
    setCurrent(next)
  }

  function skip(delta) {
    const now = native ? (file()?.currentTime || current) : (yt()?.getCurrentTime?.() || current)
    seekTo(now + delta)
  }

  function applySpeed(rate) {
    setSpeed(rate)
    localStorage.setItem('yt-player-speed', String(rate))
    if (native && file()) file().playbackRate = rate
    else yt()?.setPlaybackRate?.(rate)
  }

  function applyQuality(id) {
    setQuality(id)
    localStorage.setItem('yt-player-quality', id)
    const next = id === 'auto' ? initialAutoQuality() : id
    setAbrId(next)
    lastSwitch.current = 0
    applyAbr(next, true)
  }

  function applyAbr(nextId, force = false) {
    const now = Date.now()
    if (!force && now - lastSwitch.current < 6000) return
    if (native) {
      const nextSrc = streamWithQuality(media, nextId, sourceVideo)
      if (!nextSrc || nextSrc === src) return
      lastSwitch.current = now
      resumeAt.current = file()?.currentTime || current
      setAbrId(nextId)
      setSrc(nextSrc)
      return
    }
    lastSwitch.current = now
    setAbrId(nextId)
    const player = yt()
    if (!player?.setPlaybackQuality) return
    const ytId = youtubeQuality(nextId)
    player.setPlaybackQuality(ytId)
    if (quality !== 'auto') player.setPlaybackQualityRange?.(ytId, ytId)
  }

  function applyCaptions(on) {
    setCaptions(on)
    const player = yt()
    if (!player) return
    try {
      if (on) {
        player.loadModule?.('captions')
        player.setOption?.('captions', 'track', { languageCode: 'en' })
      } else {
        player.unloadModule?.('captions')
      }
    } catch {
      setCaptions(on)
    }
  }

  function applyVolume(value) {
    setVolume(value)
    setMuted(value === 0)
    if (native && file()) {
      file().volume = value
      file().muted = value === 0
    } else {
      yt()?.setVolume?.(value * 100)
      if (value === 0) yt()?.mute?.()
      else yt()?.unMute?.()
    }
  }

  function toggleMute() {
    applyVolume(muted ? (volume || 1) : 0)
  }

  function currentTime() {
    return native ? (file()?.currentTime || 0) : (yt()?.getCurrentTime?.() || current)
  }

  const { syncNow, reset } = usePlaybackProgress({
    videoId: getVideoId(video),
    getTime: currentTime,
    playing,
  })

  function barRatio(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  }

  function scrubStart(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setScrubbing(true)
    seekTo(barRatio(event) * (duration || 0))
  }

  function scrubMove(event) {
    const ratio = barRatio(event)
    setHover(ratio)
    if (scrubbing) seekTo(ratio * (duration || 0))
  }

  function scrubKey(event) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); skip(-5) }
    if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); skip(5) }
  }

  function goFullscreen() {
    const node = boxRef.current
    if (!node) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else {
      setMini(false)
      node.requestFullscreen?.().catch(() => {})
    }
  }

  function toggleMini() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    setMini((value) => !value)
  }

  useEffect(() => {
    const sync = () => setWide(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  useEffect(() => {
    setSrc(streamWithQuality(media, activeQuality, sourceVideo) || media)
  }, [media])

  useEffect(() => {
    setRenditions(video?.renditions || [])
  }, [video])

  useEffect(() => {
    if (!native || renditions.length) return undefined
    const id = getVideoId(video)
    if (!/^[a-f0-9]{24}$/i.test(String(id || ''))) return undefined
    const timer = window.setInterval(() => {
      fetch(`${API}/videos/${id}`).then((response) => {
        if (!response.ok) return null
        return response.json()
      }).then((data) => {
        if (data?.renditions?.length) setRenditions(data.renditions)
      }).catch((error) => {
        if (error?.name && error.name !== 'TypeError') return
      })
    }, 12000)
    return () => window.clearInterval(timer)
  }, [native, renditions.length, video])

  useEffect(() => {
    if (!native) return undefined
    const node = file()
    if (!node || !src) return undefined
    const resume = resumeAt.current
    if (resume != null) {
      node.currentTime = resume
      resumeAt.current = null
    } else if (startAt) node.currentTime = startAt
    node.playbackRate = speed
    node.play().catch(() => setPlaying(false))
    return undefined
  }, [native, src])

  useEffect(() => {
    if (!startAt || startAt < 2) return
    const total = native ? (file()?.duration || duration) : (yt()?.getDuration?.() || duration)
    const target = total > 0 && startAt >= total - 5 ? 0 : startAt
    if (target < 2) return
    const now = currentTime()
    if (now > 8 && Math.abs(now - target) > 8) return
    if (native && file()?.readyState >= 1) file().currentTime = target
    else if (!native && yt()?.seekTo) yt().seekTo(target, true)
  }, [startAt, native, src, duration])

  useEffect(() => {
    if (native) return undefined
    let player
    let stop = false
    loadYouTubeApi().then((YT) => {
      if (stop || !hostRef.current) return
      player = new YT.Player(hostRef.current, {
        host: 'https://www.youtube-nocookie.com',
        videoId: getVideoId(video),
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, fs: 0, iv_load_policy: 3, start: startAt || undefined, origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            ytRef.current = event.target
            event.target.setPlaybackRate?.(speed)
            event.target.setPlaybackQuality?.(youtubeQuality(activeQuality))
            event.target.playVideo()
            setDuration(event.target.getDuration() || 0)
          },
          onStateChange: (event) => {
            setPlaying(event.data === 1)
            setWaiting(event.data === 3)
            if (event.data === 3 && quality === 'auto') applyAbr(chooseQuality({ locked: quality, kbps: networkKbps(), bufferSec: 0, waiting: true, currentId: abrId }), true)
            if (event.data === 2) syncNow()
            if (event.data === 0) {
              reset()
              onNext?.()
            }
          },
        },
      })
    }).catch(() => setPlaying(false))
    return () => {
      stop = true
      player?.destroy?.()
      ytRef.current = null
    }
  }, [native, getVideoId(video)])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (native && file()) {
        const node = file()
        setCurrent(node.currentTime || 0)
        setDuration(node.duration || 0)
        setPlaying(!node.paused)
        if (node.buffered.length) setBuffered(node.buffered.end(node.buffered.length - 1) / (node.duration || 1))
      } else if (yt()?.getCurrentTime) {
        const now = yt().getCurrentTime() || 0
        const total = yt().getDuration() || 0
        setCurrent(now)
        setDuration(total)
        setBuffered(yt().getVideoLoadedFraction?.() || 0)
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [native])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (quality !== 'auto') return
      const bufferSec = native ? bufferSeconds(file()) : Math.max(0, ((yt()?.getVideoLoadedFraction?.() || 0) * (duration || 0)) - current)
      const next = chooseQuality({ locked: quality, kbps: networkKbps(), bufferSec, waiting, currentId: abrId })
      if (next !== abrId) applyAbr(next)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [quality, native, waiting, abrId, duration, current, media])

  useEffect(() => {
    setCue(captions ? cueAt(cues, current) : '')
  }, [captions, current, cues])

  useEffect(() => {
    if (!playing) {
      setChrome(true)
      return undefined
    }
    const hide = window.setTimeout(() => { if (!panel) setChrome(false) }, 2800)
    return () => window.clearTimeout(hide)
  }, [playing, chrome, panel])

  useEffect(() => {
    function onKey(event) {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
      if (event.key === ' ' || event.key === 'k') { event.preventDefault(); playToggle() }
      if (event.key === 'ArrowLeft') skip(-10)
      if (event.key === 'ArrowRight') skip(10)
      if (event.key === 'f') goFullscreen()
      if (event.key === 'm') toggleMute()
      if (event.key === 'c') applyCaptions(!captions)
      if (event.key === 't') onTheater?.()
      if (event.key === 'i') toggleMini()
      if (event.key === 'ArrowUp') { event.preventDefault(); applyVolume(Math.min(1, (muted ? 0 : volume) + 0.05)) }
      if (event.key === 'ArrowDown') { event.preventDefault(); applyVolume(Math.max(0, (muted ? 0 : volume) - 0.05)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const played = duration ? (current / duration) * 100 : 0
  const loaded = buffered * 100

  const volShown = muted ? 0 : volume
  const volIcon = volShown === 0 ? 'volumeMute' : volShown < 0.5 ? 'volumeLow' : 'volumeHigh'

  return (
    <>
    {mini && <div className="watch-player mini-hold" />}
    <div
      ref={boxRef}
      className={`watch-player yt-player ${chrome || panel || scrubbing ? 'show-chrome' : ''} ${theater ? 'is-theater' : ''} ${mini ? 'is-mini' : ''} ${wide ? 'is-full' : ''}`}
      onMouseMove={() => setChrome(true)}
      onMouseLeave={() => playing && !panel && setChrome(false)}
    >
      <div className="player-stage" onClick={playToggle} onDoubleClick={goFullscreen}>
        {native ? (
          <video
            ref={videoRef}
            src={src}
            playsInline
            preload="auto"
            onWaiting={() => {
              setWaiting(true)
              if (quality === 'auto') applyAbr(chooseQuality({ locked: quality, kbps: networkKbps(), bufferSec: 0, waiting: true, currentId: abrId }), true)
            }}
            onPlaying={() => setWaiting(false)}
            onPause={() => syncNow()}
            onEnded={() => {
              reset()
              if ((file()?.duration || duration) > 1) onNext?.()
            }}
            onError={() => {
              const next = fallbackStreamUrl(video, src, API)
              if (next) setSrc(next)
              else setPlaying(false)
            }}
          />
        ) : (
          <div key={getVideoId(video)} ref={hostRef} className="yt-host" />
        )}
        {cue && <div className="player-cue">{cue}</div>}
        {quality === 'auto' && <span className="abr-badge">Auto · {qualityLabel(activeQuality)}</span>}
      </div>
      <div className="player-chrome">
        <div
          className={`player-progress ${scrubbing ? 'scrubbing' : ''}`}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(current)}
          onPointerDown={scrubStart}
          onPointerMove={scrubMove}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={scrubKey}
        >
          <div className="track">
            <span className="buf" style={{ width: `${loaded}%` }} />
            {hover != null && <span className="hov" style={{ width: `${hover * 100}%` }} />}
            <span className="play" style={{ width: `${played}%` }} />
          </div>
          <i style={{ left: `${played}%` }} />
          {hover != null && <em className="scrub-tip" style={{ left: `${hover * 100}%` }}>{formatClock(hover * (duration || 0))}</em>}
        </div>
        <div className="player-bar">
          <button type="button" data-tip={playing ? 'Pause (k)' : 'Play (k)'} aria-label={playing ? 'Pause' : 'Play'} onClick={playToggle}><PlayerIcon name={playing ? 'pause' : 'play'} size={28} /></button>
          <div className="vol-wrap">
            <button type="button" data-tip={volShown === 0 ? 'Unmute (m)' : 'Mute (m)'} aria-label="Volume" onClick={toggleMute}><PlayerIcon name={volIcon} /></button>
            <input
              className="vol-slider"
              type="range"
              min="0"
              max="1"
              step="0.02"
              aria-label="Volume level"
              value={volShown}
              style={{ '--vol': `${volShown * 100}%` }}
              onChange={(event) => applyVolume(Number(event.target.value))}
            />
          </div>
          <span className="player-time">{formatClock(current)} <span className="sep">/</span> <span className="total">{formatClock(duration)}</span></span>
          <span className="player-spacer" />
          <button type="button" className={captions ? 'on' : ''} data-tip="Subtitles/closed captions (c)" aria-label="Captions" aria-pressed={captions} onClick={() => applyCaptions(!captions)}><PlayerIcon name="captions" /></button>
          <div className="gear-wrap">
            <button type="button" data-tip="Settings" aria-label="Settings" onClick={() => setPanel((value) => (value ? '' : 'main'))}><PlayerIcon name="settings" /></button>
            {panel && (
              <div className="player-menu">
                {panel !== 'main' && <button type="button" className="back" onClick={() => setPanel('main')}>Back</button>}
                <WatchSettings panel={panel} setPanel={setPanel} speed={speed} quality={quality} activeQuality={activeQuality} captions={captions} onSpeed={applySpeed} onQuality={applyQuality} onCaptions={applyCaptions} category={video?.category} />
              </div>
            )}
          </div>
          <button type="button" data-tip={mini ? 'Expand (i)' : 'Miniplayer (i)'} aria-label="Miniplayer" onClick={toggleMini}><PlayerIcon name="mini" /></button>
          <button type="button" className="btn-theater" data-tip={theater ? 'Default view (t)' : 'Theater mode (t)'} aria-label="Theater mode" aria-pressed={Boolean(theater)} onClick={onTheater}><PlayerIcon name={theater ? 'theaterOn' : 'theater'} /></button>
          <button type="button" data-tip={wide ? 'Exit full screen (f)' : 'Full screen (f)'} aria-label="Full screen" onClick={goFullscreen}><PlayerIcon name={wide ? 'fullscreenExit' : 'fullscreen'} /></button>
        </div>
      </div>
    </div>
    </>
  )
}

export default WatchPlayer
