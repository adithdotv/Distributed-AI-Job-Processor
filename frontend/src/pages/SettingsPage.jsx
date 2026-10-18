import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/toast/toastContext'
import { fetchHealth } from '../api/jobProcessorApi'
import { getApiBaseUrl, getEnvApiBaseUrl, saveApiBaseUrl } from '../api/client'
import { usePolling } from '../hooks/usePolling'

const CONNECTION_POLL_INTERVAL_MS = 10000
const URL_ERROR_MESSAGE = 'Enter a full URL that starts with http:// or https://, for example http://localhost:8000.'

function isValidHttpUrl(value) {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function ConnectionStatus({ health, error, isLoading }) {
  if (isLoading) return <span className="system-status" role="status">Checking connection…</span>
  if (!health) {
    return (
      <span className="system-status system-status-down" role="status">
        Unreachable: {error.message}
      </span>
    )
  }

  const isRedisUp = health.redis === 'connected'
  return (
    <span className={`system-status ${isRedisUp ? 'system-status-up' : 'system-status-down'}`} role="status">
      API online · Redis {health.redis}
    </span>
  )
}

export function SettingsPage() {
  const [apiUrlDraft, setApiUrlDraft] = useState(getApiBaseUrl)
  const [urlError, setUrlError] = useState(null)
  const toast = useToast()
  const { data: health, error, isLoading, updatedAt, reload } = usePolling(fetchHealth, {
    intervalMs: CONNECTION_POLL_INTERVAL_MS,
  })

  function applyApiUrl(url) {
    try {
      saveApiBaseUrl(url)
      toast.success('API URL updated. Testing the connection…')
      reload()
    } catch (saveError) {
      setUrlError(saveError.message)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedUrl = apiUrlDraft.trim()

    if (!isValidHttpUrl(trimmedUrl)) {
      setUrlError(URL_ERROR_MESSAGE)
      return
    }

    setUrlError(null)
    applyApiUrl(trimmedUrl)
  }

  function resetToDefault() {
    setApiUrlDraft(getEnvApiBaseUrl())
    setUrlError(null)
    applyApiUrl('')
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Frontend connection settings. Server configuration is managed on the backend."
        updatedAt={updatedAt}
        onRefresh={reload}
      />

      <section className="card" aria-labelledby="connection-title">
        <h2 id="connection-title">API connection</h2>
        <div>
          <ConnectionStatus health={health} error={error} isLoading={isLoading} />
        </div>
      </section>

      <form className="card" onSubmit={handleSubmit} noValidate aria-labelledby="api-url-title">
        <h2 id="api-url-title">API base URL</h2>
        <div className="field">
          <label htmlFor="api-base-url">Base URL</label>
          <input
            id="api-base-url"
            type="url"
            value={apiUrlDraft}
            aria-invalid={urlError ? 'true' : undefined}
            aria-describedby={urlError ? 'api-base-url-error' : 'api-base-url-hint'}
            onChange={(event) => setApiUrlDraft(event.target.value)}
          />
          {urlError ? (
            <p id="api-base-url-error" className="field-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {urlError}
            </p>
          ) : (
            <p id="api-base-url-hint" className="field-hint">
              Saved in this browser only. The default comes from VITE_API_BASE_URL at build time.
            </p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={resetToDefault}>
            Reset to default
          </button>
          <button type="submit" className="button button-primary">Save and test</button>
        </div>
      </form>
    </>
  )
}
