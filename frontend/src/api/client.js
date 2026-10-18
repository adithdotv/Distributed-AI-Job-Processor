const DEFAULT_API_BASE_URL = 'http://localhost:8000'
const API_BASE_URL_STORAGE_KEY = 'jobProcessor.apiBaseUrl'

export class ApiError extends Error {
  constructor(message, { status = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getEnvApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
}

export function getApiBaseUrl() {
  try {
    const storedUrl = localStorage.getItem(API_BASE_URL_STORAGE_KEY)
    if (storedUrl) return storedUrl
  } catch {
    // Storage can be unavailable (private mode); fall back to the build-time URL.
  }
  return getEnvApiBaseUrl()
}

export function saveApiBaseUrl(url) {
  try {
    if (url) {
      localStorage.setItem(API_BASE_URL_STORAGE_KEY, url)
    } else {
      localStorage.removeItem(API_BASE_URL_STORAGE_KEY)
    }
  } catch {
    throw new ApiError('Browser storage is unavailable, so the URL could not be saved.')
  }
}

function describeErrorDetail(detail) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? JSON.stringify(item)).join('; ')
  }
  return null
}

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    return describeErrorDetail(body.detail) ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status} ${response.statusText})`
  }
}

export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '')
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const queryString = query.size > 0 ? `?${query}` : ''

  let response
  try {
    response = await fetch(`${baseUrl}${path}${queryString}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(
      `Cannot reach the API at ${baseUrl}. Check that the backend is running and CORS allows this origin.`,
    )
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), { status: response.status })
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('The API returned a response that is not valid JSON.', {
      status: response.status,
    })
  }
}
