function toPercent(part, total) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (part / total) * 100))
}

export function getBatchProgress(batch) {
  const completedPercent = toPercent(batch.completed_jobs, batch.total_jobs)
  const failedPercent = Math.min(
    toPercent(batch.failed_jobs, batch.total_jobs),
    100 - completedPercent,
  )

  return {
    completedPercent,
    failedPercent,
    finishedPercent: completedPercent + failedPercent,
    finishedJobs: batch.completed_jobs + batch.failed_jobs,
  }
}

export function sumJobCounts(batches) {
  return batches.reduce(
    (totals, batch) => ({
      total: totals.total + batch.total_jobs,
      completed: totals.completed + batch.completed_jobs,
      failed: totals.failed + batch.failed_jobs,
      pending: totals.pending + batch.pending_jobs,
      processing: totals.processing + batch.processing_jobs,
    }),
    { total: 0, completed: 0, failed: 0, pending: 0, processing: 0 },
  )
}
