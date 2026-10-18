import { CopyButton } from './CopyButton'
import { Drawer } from './Drawer'
import { StatusBadge } from './StatusBadge'
import { formatDateTime } from '../utils/format'

function TextBlock({ label, text }) {
  return (
    <section className="detail-section">
      <div className="detail-section-header">
        <h3>{label}</h3>
        <CopyButton text={text} />
      </div>
      <pre className="text-block" tabIndex={0} aria-label={label}>{text}</pre>
    </section>
  )
}

export function JobDetailDrawer({ job, onClose }) {
  return (
    <Drawer title={`Job #${job.id}`} onClose={onClose}>
      <dl className="detail-grid">
        <dt>Status</dt>
        <dd><StatusBadge status={job.status} /></dd>
        <dt>Batch</dt>
        <dd><a href={`#/batches/${job.batch_id}`}>Batch #{job.batch_id}</a></dd>
        <dt>Attempts</dt>
        <dd>{job.attempts}</dd>
        <dt>Created</dt>
        <dd>{formatDateTime(job.created_at)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(job.updated_at)}</dd>
      </dl>

      <TextBlock label="Input" text={job.input_data} />

      {job.result ? (
        <TextBlock label="Result" text={job.result} />
      ) : (
        <section className="detail-section">
          <h3>Result</h3>
          <p className="text-secondary">No result stored yet.</p>
        </section>
      )}

      {job.status === 'failed' && (
        <p className="banner banner-error">
          This job used all of its attempts. Error messages are recorded in the
          job_attempts table but are not exposed by the API yet.
        </p>
      )}
    </Drawer>
  )
}
