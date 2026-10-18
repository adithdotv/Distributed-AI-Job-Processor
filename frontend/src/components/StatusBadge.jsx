import { STATUS_ICONS, getStatusLabel } from '../utils/status'

export function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status]

  return (
    <span className={`badge tone-${status}`}>
      {Icon && <Icon aria-hidden="true" className={status === 'processing' ? 'spin' : undefined} />}
      {getStatusLabel(status)}
    </span>
  )
}
