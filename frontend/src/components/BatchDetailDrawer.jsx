import { useState } from 'react'
import { Drawer } from './Drawer'
import { JobDetailDrawer } from './JobDetailDrawer'
import { ProgressBar } from './ProgressBar'
import { ErrorBanner, ErrorState, LoadingRows } from './StateViews'
import { StatusBadge } from './StatusBadge'
import { usePolling } from '../hooks/usePolling'
import { fetchBatch, fetchBatchJobs } from '../api/jobProcessorApi'
import { formatDateTime, formatNumber } from '../utils/format'

const BATCH_POLL_INTERVAL_MS = 3000

async function fetchBatchWithJobs(batchId) {
  const [batch, jobs] = await Promise.all([fetchBatch(batchId), fetchBatchJobs(batchId)])
  return { batch, jobs }
}

function BatchCounts({ batch }) {
  const counts = [
    ['Total', batch.total_jobs],
    ['Completed', batch.completed_jobs],
    ['Failed', batch.failed_jobs],
    ['Pending', batch.pending_jobs],
    ['Processing', batch.processing_jobs],
  ]

  return (
    <dl className="count-grid">
      {counts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{formatNumber(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function BatchDetailContent({ batchId }) {
  const [selectedJobId, setSelectedJobId] = useState(null)
  const { data, error, isLoading, reload } = usePolling(() => fetchBatchWithJobs(batchId), {
    intervalMs: BATCH_POLL_INTERVAL_MS,
    resetKey: String(batchId),
  })

  if (isLoading) return <LoadingRows />
  if (!data) return <ErrorState error={error} onRetry={reload} />

  const { batch, jobs } = data
  const selectedJob = jobs.find((job) => job.id === selectedJobId)

  return (
    <>
      {error && <ErrorBanner error={error} />}
      <div className="stack">
        <div className="detail-summary">
          <StatusBadge status={batch.status} />
          <span className="text-secondary">Created {formatDateTime(batch.created_at)}</span>
        </div>
        <ProgressBar batch={batch} />
      </div>
      <BatchCounts batch={batch} />

      <section className="stack" aria-labelledby="batch-jobs-title">
        <h3 id="batch-jobs-title">Jobs</h3>
        <ul className="job-list">
          {jobs.map((job) => (
            <li key={job.id}>
              <button type="button" className="job-list-item" onClick={() => setSelectedJobId(job.id)}>
                <span className="mono">#{job.id}</span>
                <StatusBadge status={job.status} />
                <span className="job-list-preview clamp-2">{job.result ?? job.input_data}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selectedJob && <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJobId(null)} />}
    </>
  )
}

export function BatchDetailDrawer({ batchId, onClose }) {
  return (
    <Drawer title={`Batch #${batchId}`} onClose={onClose}>
      <BatchDetailContent batchId={batchId} />
    </Drawer>
  )
}
