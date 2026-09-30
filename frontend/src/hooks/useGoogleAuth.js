import { useCallback, useEffect, useRef, useState } from 'react'
import { googleOriginHelp, loadGoogleIdentityScript } from '../utils/googleAuth'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const FOCUS_GRACE_MS = 800

async function exchangeGoogleCredential(credential) {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (!response.ok) {
    throw new Error('Google sign-in failed')
  }
  const body = await response.json()
  if (!body?.access_token) {
    throw new Error('Google sign-in failed')
  }
  return body.access_token
}

function renderGoogleButton(container, clientId, onCredential) {
  window.google.accounts.id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: false,
    callback: onCredential,
  })
  container.replaceChildren()
  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'medium',
    text: 'signin_with',
    shape: 'pill',
  })
}

function useSignInFocusHint(pendingAtRef, setError) {
  useEffect(() => {
    function onFocus() {
      if (!pendingAtRef.current) return
      window.setTimeout(() => {
        if (!pendingAtRef.current) return
        if (localStorage.getItem('access_token')) {
          pendingAtRef.current = 0
          return
        }
        pendingAtRef.current = 0
        if (window.location.origin !== 'http://localhost:5173') {
          setError('googleOriginMismatch')
        }
      }, FOCUS_GRACE_MS)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [pendingAtRef, setError])
}

/**
 * Google Identity Services button + credential exchange with the API.
 */
export function useGoogleAuth({ googleButtonRef, onSuccess }) {
  const [error, setError] = useState('')
  const pendingAtRef = useRef(0)
  const onSuccessRef = useRef(onSuccess)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  onSuccessRef.current = onSuccess

  useEffect(() => {
    if (!clientId) {
      setError('googleNotConfigured')
      return undefined
    }
    if (!googleButtonRef.current) return undefined
    let cancelled = false

    function handleCredential({ credential }) {
      pendingAtRef.current = 0
      setError('')
      exchangeGoogleCredential(credential)
        .then((accessToken) => onSuccessRef.current?.(credential, accessToken))
        .catch(() => setError('googleSignInIncomplete'))
    }

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current) return
        renderGoogleButton(googleButtonRef.current, clientId, handleCredential)
      })
      .catch(() => {
        if (!cancelled) setError('googleScriptFailed')
      })

    return () => {
      cancelled = true
    }
  }, [clientId, googleButtonRef])

  useSignInFocusHint(pendingAtRef, setError)

  useEffect(() => {
    const node = googleButtonRef.current
    if (!node) return undefined
    function markPending() {
      pendingAtRef.current = Date.now()
      setError('')
    }
    node.addEventListener('click', markPending)
    return () => node.removeEventListener('click', markPending)
  }, [googleButtonRef])

  const openGoogleSignIn = useCallback(() => {
    if (!clientId) {
      setError('googleNotConfigured')
      return
    }
    pendingAtRef.current = Date.now()
    setError('')
    googleButtonRef.current?.querySelector('div[role="button"]')?.click()
  }, [clientId, googleButtonRef])

  return { error, setError, openGoogleSignIn, originHelp: googleOriginHelp() }
}
