import { getBatchProgress } from '../utils/batchProgress'

export function ProgressBar({ batch }) {
  const { completedPercent, failedPercent, finishedJobs } = getBatchProgress(batch)

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={batch.total_jobs}
      aria-valuenow={finishedJobs}
      aria-label={`${finishedJobs} of ${batch.total_jobs} jobs finished`}
    >
      <div className="progress-segment progress-completed" style={{ width: `${completedPercent}%` }} />
      <div className="progress-segment progress-failed" style={{ width: `${failedPercent}%` }} />
    </div>
  )
}
