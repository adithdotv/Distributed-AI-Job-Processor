import { Sigma } from 'lucide-react'
import { BatchTable } from '../components/BatchTable'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorBanner, ErrorState, LoadingRows } from '../components/StateViews'
import { fetchBatches, fetchHealth } from '../api/jobProcessorApi'
import { usePolling } from '../hooks/usePolling'
import { sumJobCounts } from '../utils/batchProgress'
import { formatNumber } from '../utils/format'
import { STATUS_ICONS, getStatusLabel } from '../utils/status'

const BATCH_LIMIT = 200
const RECENT_BATCH_COUNT = 8
const OVERVIEW_POLL_INTERVAL_MS = 5000

const STATUS_ORDER = ['completed', 'failed', 'processing', 'pending']

function fetchBatchesForOverview() {
  return fetchBatches({ limit: BATCH_LIMIT })
}

function StatCards({ totals }) {
  return (
    <div className="stat-grid">
      <div className="card stat-card">
        <span className="stat-label"><Sigma aria-hidden="true" />Total jobs</span>
        <span className="stat-value">{formatNumber(totals.total)}</span>
      </div>
      {STATUS_ORDER.map((status) => {
        const Icon = STATUS_ICONS[status]
        return (
          <div key={status} className={`card stat-card tone-${status}`}>
            <span className="stat-label">
              <Icon aria-hidden="true" />
              {getStatusLabel(status)}
            </span>
            <span className="stat-value">{formatNumber(totals[status])}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatusDistribution({ totals }) {
  return (
    <section className="card" aria-labelledby="distribution-title">
      <h2 id="distribution-title">Job status distribution</h2>
      <div className="progress progress-lg" role="img" aria-label={describeDistribution(totals)}>
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={`progress-segment progress-${status}`}
            style={{ width: `${(totals[status] / totals.total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="legend">
        {STATUS_ORDER.map((status) => {
          const Icon = STATUS_ICONS[status]
          return (
            <li key={status} className={`tone-${status}`}>
              <Icon aria-hidden="true" />
              {getStatusLabel(status)}
              <span className="text-secondary">{formatNumber(totals[status])}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function describeDistribution(totals) {
  return STATUS_ORDER
    .map((status) => `${formatNumber(totals[status])} ${getStatusLabel(status).toLowerCase()}`)
    .join(', ')
}

function SystemStatus() {
  const { data, error } = usePolling(fetchHealth, { intervalMs: OVERVIEW_POLL_INTERVAL_MS })

  if (!data && error) {
    return <span className="system-status system-status-down" role="status">API unreachable</span>
  }
  if (!data) return <span className="system-status" role="status">Checking API…</span>

  const isRedisUp = data.redis === 'connected'
  return (
    <span className={`system-status ${isRedisUp ? 'system-status-up' : 'system-status-down'}`} role="status">
      API online · Redis {data.redis}
    </span>
  )
}

export function OverviewPage() {
  const { data: batches, error, isLoading, updatedAt, reload } = usePolling(
    fetchBatchesForOverview,
    { intervalMs: OVERVIEW_POLL_INTERVAL_MS },
  )

  function renderContent() {
    if (isLoading) return <LoadingRows />
    if (!batches) return <ErrorState error={error} onRetry={reload} />
    if (batches.length === 0) {
      return (
        <EmptyState
          title="No batches yet"
          description="Submit a batch and its job metrics will appear here."
          action={<a className="button button-primary" href="#/batches">Submit a batch</a>}
        />
      )
    }

    const totals = sumJobCounts(batches)

    return (
      <>
        {error && <ErrorBanner error={error} />}
        <StatCards totals={totals} />
        {totals.total > 0 && <StatusDistribution totals={totals} />}
        {batches.length === BATCH_LIMIT && (
          <p className="text-secondary text-small">
            Totals cover the {BATCH_LIMIT} most recent batches.
          </p>
        )}
        <section className="card" aria-labelledby="recent-batches-title">
          <div className="card-header">
            <h2 id="recent-batches-title">Recent batches</h2>
            <a href="#/batches">View all batches</a>
          </div>
          <BatchTable batches={batches.slice(0, RECENT_BATCH_COUNT)} caption="Recent batches" />
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="Job metrics derived from the batch summaries reported by the API."
        updatedAt={updatedAt}
        onRefresh={reload}
      >
        <SystemStatus />
      </PageHeader>
      {renderContent()}
    </>
  )
}
