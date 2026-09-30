const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/**
 * Load Google Identity Services once. Safe to call from multiple components.
 */
export function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google script failed')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google script failed'))
    document.head.appendChild(script)
  })
}

/**
 * Decode Google JWT display fields. Signature verification happens on the API.
 */
export function readGoogleProfile(credential) {
  try {
    const payload = credential.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Help text for Google Error 400 origin_mismatch.
 */
export function googleOriginHelp(origin = window.location.origin) {
  return `Google blocked ${origin}. In Google Cloud Console open APIs & Services → Credentials → your OAuth 2.0 Client ID, and add these Authorized JavaScript origins: ${origin}, http://localhost:5173, http://127.0.0.1:5173. Open the app at http://localhost:5173 (not 127.0.0.1 and not port 5174).`
}
