import { BatchDetailDrawer } from '../components/BatchDetailDrawer'
import { BatchForm } from '../components/BatchForm'
import { BatchTable } from '../components/BatchTable'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorBanner, ErrorState, LoadingRows } from '../components/StateViews'
import { fetchBatches } from '../api/jobProcessorApi'
import { navigate } from '../hooks/useHashRoute'
import { usePolling } from '../hooks/usePolling'

const BATCHES_POLL_INTERVAL_MS = 5000
const BATCH_LIMIT = 50

function fetchRecentBatches() {
  return fetchBatches({ limit: BATCH_LIMIT })
}

export function BatchesPage({ selectedBatchId }) {
  const { data: batches, error, isLoading, updatedAt, reload } = usePolling(fetchRecentBatches, {
    intervalMs: BATCHES_POLL_INTERVAL_MS,
  })

  function handleBatchCreated(batch) {
    reload()
    navigate(`batches/${batch.id}`)
  }

  function renderBatches() {
    if (isLoading) return <LoadingRows />
    if (!batches) return <ErrorState error={error} onRetry={reload} />
    if (batches.length === 0) {
      return <EmptyState title="No batches yet" description="Submit your first batch using the form above." />
    }

    return (
      <>
        {error && <ErrorBanner error={error} />}
        <BatchTable batches={batches} caption="Recent batches" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Batches"
        description={`Submit work and track the ${BATCH_LIMIT} most recent batches.`}
        updatedAt={updatedAt}
        onRefresh={reload}
      />
      <BatchForm onCreated={handleBatchCreated} />
      <section className="card" aria-labelledby="batches-title">
        <h2 id="batches-title">Recent batches</h2>
        {renderBatches()}
      </section>

      {selectedBatchId && (
        <BatchDetailDrawer batchId={selectedBatchId} onClose={() => navigate('batches')} />
      )}
    </>
  )
}
