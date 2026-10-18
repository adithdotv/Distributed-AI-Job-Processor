import { CircleCheck, CircleX, Clock, LoaderCircle, TriangleAlert } from 'lucide-react'

export const JOB_STATUSES = ['pending', 'processing', 'completed', 'failed']

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  completed_with_failures: 'Completed with failures',
}

// Each status has its own icon so meaning never depends on color alone.
export const STATUS_ICONS = {
  pending: Clock,
  processing: LoaderCircle,
  completed: CircleCheck,
  failed: CircleX,
  completed_with_failures: TriangleAlert,
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? status
}
