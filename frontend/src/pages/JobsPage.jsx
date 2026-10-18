import { useState } from 'react'
import { Search } from 'lucide-react'
import { JobDetailDrawer } from '../components/JobDetailDrawer'
import { PageHeader } from '../components/PageHeader'
import { RelativeTime } from '../components/RelativeTime'
import { EmptyState, ErrorBanner, ErrorState, LoadingRows } from '../components/StateViews'
import { StatusBadge } from '../components/StatusBadge'
import { fetchJobs } from '../api/jobProcessorApi'
import { usePolling } from '../hooks/usePolling'
import { JOB_STATUSES, getStatusLabel } from '../utils/status'

const JOBS_POLL_INTERVAL_MS = 5000

function matchesSearch(job, searchText) {
  const needle = searchText.trim().toLowerCase().replace(/^#/, '')
  if (!needle) return true

  return [String(job.id), String(job.batch_id), job.input_data, job.result ?? '']
    .some((field) => field.toLowerCase().includes(needle))
}

function JobsTable({ jobs, onSelectJob }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <caption className="visually-hidden">Jobs, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Job</th>
            <th scope="col">Batch</th>
            <th scope="col">Status</th>
            <th scope="col" className="numeric hide-on-mobile">Attempts</th>
            <th scope="col" className="hide-on-mobile">Updated</th>
            <th scope="col" className="hide-on-mobile">Result or input</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <th scope="row">
                <button type="button" className="link-button mono" onClick={() => onSelectJob(job)}>
                  #{job.id}
                </button>
              </th>
              <td><a className="mono" href={`#/batches/${job.batch_id}`}>#{job.batch_id}</a></td>
              <td><StatusBadge status={job.status} /></td>
              <td className="numeric hide-on-mobile">{job.attempts}</td>
              <td className="text-secondary hide-on-mobile"><RelativeTime isoString={job.updated_at} /></td>
              <td className="summary-cell hide-on-mobile">
                <span className="clamp-2" title={job.result ?? job.input_data}>
                  {job.result ?? job.input_data}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function JobsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [selectedJobId, setSelectedJobId] = useState(null)

  const { data: jobs, error, isLoading, updatedAt, reload } = usePolling(
    () => fetchJobs({ status: statusFilter }),
    { intervalMs: JOBS_POLL_INTERVAL_MS, resetKey: statusFilter },
  )

  const visibleJobs = jobs?.filter((job) => matchesSearch(job, searchText)) ?? []
  const selectedJob = jobs?.find((job) => job.id === selectedJobId)

  function renderContent() {
    if (isLoading) return <LoadingRows />
    if (!jobs) return <ErrorState error={error} onRetry={reload} />
    if (visibleJobs.length === 0) {
      return (
        <EmptyState
          title="No jobs found"
          description={
            jobs.length === 0
              ? 'No jobs match this status yet.'
              : 'No jobs match your search. Try a different term or clear the search.'
          }
        />
      )
    }

    return (
      <>
        {error && <ErrorBanner error={error} />}
        <JobsTable jobs={visibleJobs} onSelectJob={(job) => setSelectedJobId(job.id)} />
        <p className="text-secondary text-small" role="status">
          Showing {visibleJobs.length} of {jobs.length} loaded jobs.
        </p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        description="The 200 most recent jobs across all batches."
        updatedAt={updatedAt}
        onRefresh={reload}
      />

      <div className="toolbar" role="search">
        <div className="search-field">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label="Search jobs"
            placeholder="Search by job ID, batch ID or text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((status) => (
            <option key={status} value={status}>{getStatusLabel(status)}</option>
          ))}
        </select>
      </div>

      {renderContent()}

      {selectedJob && (
        <JobDetailDrawer job={selectedJob} onClose={() => setSelectedJobId(null)} />
      )}
    </>
  )
}
