import { RefreshCw } from 'lucide-react'

export function PageHeader({ title, description, updatedAt, onRefresh, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-header-actions">
        {updatedAt && (
          <span className="text-secondary text-small">Updated {updatedAt.toLocaleTimeString()}</span>
        )}
        {onRefresh && (
          <button type="button" className="button" onClick={onRefresh}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        )}
        {children}
      </div>
    </header>
  )
}
