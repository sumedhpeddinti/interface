const API_BASE = import.meta.env?.VITE_API_URL || '/api'

let authToken = null

export function setAuthToken(token) {
  authToken = token
  if (token) {
    localStorage.setItem('gc_auth_token', token)
  } else {
    localStorage.removeItem('gc_auth_token')
  }
}

export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem('gc_auth_token')
  }
  return authToken
}

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = getAuthToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'omit',
  })

  const json = await response.json().catch(() => null)

  if (!response.ok || (json && json.success === false)) {
    const message = json?.error?.message || response.statusText || 'API Request failed'
    const err = new Error(message)
    err.status = response.status
    err.code = json?.error?.code
    err.details = json?.error?.details
    throw err
  }

  return json?.data !== undefined ? json.data : json
}
