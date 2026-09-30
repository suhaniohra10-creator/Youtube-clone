import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleAlert, FileImage, FileVideo, Info, LoaderCircle, Plus, UploadCloud, X } from 'lucide-react'
import { UPLOAD_CATEGORIES } from '../config'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const STEPS = ['Details', 'Video elements', 'Checks', 'Visibility']

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function VideoUpload({ onClose, onUploaded }) {
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [channelName, setChannelName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user'))?.name || 'My Channel'
    } catch {
      return 'My Channel'
    }
  })
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [category, setCategory] = useState('Tech')
  const [thumbnailMode, setThumbnailMode] = useState('video')
  const [playlist, setPlaylist] = useState('')
  const [duration, setDuration] = useState('0:00')
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [visibility, setVisibility] = useState('private')
  const [elements, setElements] = useState({ subtitles: false, endScreen: false, cards: false })
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isFileStage, setIsFileStage] = useState(false)
  const inputRef = useRef(null)
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : '', [file])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function setSelectedFile(selectedFile) {
    if (!selectedFile || !selectedFile.type.startsWith('video/')) {
      setStatusMessage('Choose an MP4, WebM, MOV, or MKV video')
      return
    }
    setFile(selectedFile)
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
    setIsFileStage(true)
    setStatusMessage('')
  }

  function selectFile(event) {
    setSelectedFile(event.target.files?.[0] || null)
  }

  function handleDrop(event) {
    event.preventDefault()
    setSelectedFile(event.dataTransfer.files?.[0] || null)
  }

  function goNext() {
    if (step === 0 && (!title.trim() || !channelName.trim())) {
      setStatusMessage('Title and channel name are required')
      return
    }
    setStatusMessage('')
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function goBack() {
    setStatusMessage('')
    setStep((current) => Math.max(current - 1, 0))
  }

  function toggleElement(name) {
    setElements((current) => ({ ...current, [name]: !current[name] }))
  }

  function submitUpload(event) {
    event.preventDefault()
    if (!file) return

    function formPayload() {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('channel_name', channelName)
      formData.append('description', description)
      formData.append('duration', duration)
      formData.append('duration_seconds', String(Math.round(durationSeconds) || 0))
      formData.append('thumbnail_url', thumbnailUrl)
      formData.append('category', category)
      formData.append('channel_id', channelName)
      formData.append('file', file)
      return formData
    }

    function postFile(withAuth) {
      const request = new XMLHttpRequest()
      request.open('POST', `${API_URL}/videos/upload`)
      const token = localStorage.getItem('access_token')
      if (withAuth && token) request.setRequestHeader('Authorization', `Bearer ${token}`)
      request.timeout = 30 * 60 * 1000
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100))
      }
      request.onload = () => {
        if (request.status === 401 && withAuth) {
          postFile(false)
          return
        }
        setIsUploading(false)
        if (request.status >= 200 && request.status < 300) {
          onUploaded({ ...JSON.parse(request.responseText), visibility, category })
          onClose()
          return
        }
        try {
          setStatusMessage(JSON.parse(request.responseText).detail || 'Upload failed')
        } catch {
          setStatusMessage('Upload failed')
        }
      }
      request.onerror = () => {
        setIsUploading(false)
        setStatusMessage('Could not connect to the backend')
      }
      request.ontimeout = () => {
        setIsUploading(false)
        setStatusMessage('Upload timed out. Check that the backend and MongoDB are running, then try again.')
      }
      request.send(formPayload())
    }

    setIsUploading(true)
    setStatusMessage('Uploading video...')
    postFile(true)
  }

  function handleMetadata(event) {
    const total = event.currentTarget.duration
    setDuration(formatDuration(total))
    setDurationSeconds(Math.round(total) || 0)
  }

  function selectThumbnail(event) {
    const image = event.target.files?.[0]
    if (!image) return
    setThumbnailUrl(URL.createObjectURL(image))
    setThumbnailMode('upload')
  }

  function selectVideoThumbnail() {
    const preview = document.querySelector('.details-preview-video')
    if (!preview || !preview.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = preview.videoWidth
    canvas.height = preview.videoHeight
    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height)
    setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.88))
    setThumbnailMode('video')
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isUploading && onClose()}>
      <section className={`upload-modal upload-wizard ${isFileStage ? 'upload-details-modal' : 'upload-start-modal'}`} role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div className="modal-header wizard-header">
          <div><h2 id="upload-title">{isFileStage ? title || 'Untitled video' : 'Upload videos'}</h2>{isFileStage && <span className="saved-private">Saved as private</span>}</div>
          <button className="icon-button" type="button" aria-label="Close upload dialog" onClick={onClose} disabled={isUploading}><X size={21} /></button>
        </div>

        {!isFileStage ? <div className="upload-start-content" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <div className="upload-drop-icon"><UploadCloud size={54} /></div>
          <p className="drop-title">Drag and drop video files to upload</p>
          <label className="select-files-button">Select files<input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={selectFile} /></label>
          <p className="upload-legal">By submitting your videos to YouTube, you acknowledge that you agree to YouTube's <a href="#terms">Terms of Service</a> and <a href="#guidelines">Community Guidelines</a>.<br />Please ensure your videos don't violate anyone else's privacy or copyright. <a href="#learn">Learn more</a></p>
        </div> : <>
          <div className="wizard-steps">{STEPS.map((name, index) => <div className={`wizard-step ${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`} key={name}><span>{index < step ? <Check size={13} /> : index + 1}</span><strong>{name}</strong></div>)}</div>
          <form className="wizard-form" onSubmit={submitUpload}>
            {step === 0 && <div className="wizard-page details-page">
              <div className="wizard-copy"><h3>Details</h3><p>Tell viewers about your video and make it easy to discover.</p><button className="reuse-button" type="button">Reuse details</button></div>
              <div className="details-grid"><div className="details-fields"><label>Title (required)<input required maxLength="100" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a title that describes your video" /><small>{title.length}/100</small></label><label>Description<textarea maxLength="5000" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell viewers about your video" rows="7" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{UPLOAD_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><section className="thumbnail-section"><h4>Thumbnail</h4><p>Set a thumbnail that stands out and draws viewers' attention. <a href="#learn">Learn more</a></p><div className="thumbnail-options"><label className={`thumbnail-option ${thumbnailMode === 'upload' ? 'selected' : ''}`}><FileImage size={22} /><strong>Upload file</strong><input type="file" accept="image/*" onChange={selectThumbnail} /></label><button className={`thumbnail-option ${thumbnailMode === 'video' ? 'selected' : ''}`} type="button" onClick={selectVideoThumbnail}>{thumbnailUrl && thumbnailMode === 'video' ? <img src={thumbnailUrl} alt="Selected video frame" /> : <FileImage size={22} />}<strong>Select from video</strong></button><button className={`thumbnail-option ${thumbnailMode === 'ab' ? 'selected' : ''}`} type="button" onClick={() => setThumbnailMode('ab')}><span className="ab-icon">A/B</span><strong>A/B Testing</strong></button></div></section><section className="playlist-section"><h4>Playlists</h4><p>Add your video to one or more playlists to organize your content for viewers. <a href="#learn">Learn more</a></p><select value={playlist} onChange={(event) => setPlaylist(event.target.value)}><option value="">Select a playlist</option><option>Watch later</option><option>React tutorials</option><option>FastAPI projects</option></select></section><label>Channel name<input required maxLength="100" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Your channel name" /></label></div><div className="video-preview-card"><video className="details-preview-video" src={previewUrl} controls playsInline onLoadedMetadata={handleMetadata} /><strong>{file.name}</strong><span>{duration} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>{thumbnailUrl && <img className="preview-thumbnail" src={thumbnailUrl} alt="Video thumbnail preview" />}</div></div>
            </div>}

            {step === 1 && <div className="wizard-page"><div className="wizard-copy"><h3>Video elements</h3><p>Use cards and an end screen to show viewers related videos and calls to action.</p></div><div className="element-list">{[['subtitles', 'Subtitles', 'Reach a broader audience by adding subtitles'], ['endScreen', 'End screen', 'Promote related content at the end of your video'], ['cards', 'Cards', 'Promote related content during your video']].map(([key, name, detail]) => <div className={`element-row ${elements[key] ? 'enabled' : ''}`} key={key}><span className="element-icon"><Plus size={18} /></span><div><strong>{name}</strong><p>{detail}</p></div><button type="button" onClick={() => toggleElement(key)}>{elements[key] ? 'Added' : 'Add'}</button></div>)}</div></div>}

            {step === 2 && <div className="wizard-page"><div className="wizard-copy"><h3>Checks</h3><p>We’ll check your video for issues that may affect publishing.</p></div><div className="check-card"><div className="check-icon"><Check size={22} /></div><div><strong>Copyright</strong><p>No issues detected yet. Checks will continue after upload.</p></div><span className="check-status">Checking</span></div><div className="check-card"><div className="check-icon"><CircleAlert size={22} /></div><div><strong>Visibility</strong><p>Your video will be saved as private until you choose who can watch it.</p></div><Info size={18} /></div></div>}

            {step === 3 && <div className="wizard-page visibility-page"><div className="wizard-copy"><h3>Visibility</h3><p>Choose when to publish and who can see your video.</p></div><div className="visibility-card"><h4>Save or publish</h4><p>Make your video public, unlisted, or private</p>{[['private', 'Private', 'Only you and people you choose can watch your video'], ['unlisted', 'Unlisted', 'Anyone with the video link can watch your video'], ['public', 'Public', 'Everyone can watch your video']].map(([value, name, detail]) => <label className="visibility-option" key={value}><input type="radio" name="visibility" value={value} checked={visibility === value} onChange={(event) => setVisibility(event.target.value)} /><span><strong>{name}</strong><small>{detail}</small></span></label>)}</div><div className="final-preview"><video src={previewUrl} controls playsInline /><strong>{title}</strong><span>{file.name}</span></div></div>}

            {statusMessage && <p className="upload-status" role="status">{statusMessage}</p>}
            <footer className="wizard-footer">{isUploading ? <div className="upload-progress"><span style={{ width: `${progress}%` }} /><b>Uploading {progress}%</b></div> : <span className="wizard-file"><FileVideo size={16} /> {file.name}</span>}<div>{step > 0 && <button className="wizard-back" type="button" onClick={goBack}>Back</button>}{step < STEPS.length - 1 ? <button className="wizard-next" type="button" onClick={goNext}>Next</button> : <button className="wizard-next" type="submit" disabled={isUploading}>{isUploading ? <><LoaderCircle className="spin" size={16} /> Saving</> : 'Save'}</button>}</div></footer>
          </form>
        </>}
      </section>
    </div>
  )
}

export default VideoUpload
