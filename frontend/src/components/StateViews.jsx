import { CircleAlert, Inbox, RefreshCw } from 'lucide-react'

const SKELETON_ROW_COUNT = 5

export function LoadingRows() {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div key={index} className="skeleton-row" />
      ))}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="state-view">
      <Inbox aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-view state-view-error" role="alert">
      <CircleAlert aria-hidden="true" />
      <h3>Could not load data</h3>
      <p>{error.message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  )
}

export function ErrorBanner({ error }) {
  return (
    <div className="banner banner-error" role="alert">
      <CircleAlert aria-hidden="true" />
      Latest refresh failed: {error.message}
    </div>
  )
}
