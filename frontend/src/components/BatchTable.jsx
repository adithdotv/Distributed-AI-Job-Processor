import { ProgressBar } from './ProgressBar'
import { RelativeTime } from './RelativeTime'
import { StatusBadge } from './StatusBadge'
import { getBatchProgress } from '../utils/batchProgress'
import { formatNumber } from '../utils/format'

export function BatchTable({ batches, caption }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Batch</th>
            <th scope="col">Status</th>
            <th scope="col" className="progress-column">Progress</th>
            <th scope="col" className="numeric hide-on-mobile">Completed</th>
            <th scope="col" className="numeric hide-on-mobile">Failed</th>
            <th scope="col" className="hide-on-mobile">Created</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.id}>
              <th scope="row">
                <a className="mono" href={`#/batches/${batch.id}`}>#{batch.id}</a>
              </th>
              <td><StatusBadge status={batch.status} /></td>
              <td className="progress-column">
                <ProgressBar batch={batch} />
                <span className="text-secondary text-small">
                  {formatNumber(getBatchProgress(batch).finishedJobs)} of {formatNumber(batch.total_jobs)} finished
                </span>
              </td>
              <td className="numeric hide-on-mobile">{formatNumber(batch.completed_jobs)}</td>
              <td className="numeric hide-on-mobile">{formatNumber(batch.failed_jobs)}</td>
              <td className="text-secondary hide-on-mobile"><RelativeTime isoString={batch.created_at} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
