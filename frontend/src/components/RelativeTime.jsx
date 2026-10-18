import { formatDateTime, formatRelativeTime } from '../utils/format'

export function RelativeTime({ isoString }) {
  return (
    <time dateTime={isoString} title={formatDateTime(isoString)}>
      {formatRelativeTime(isoString)}
    </time>
  )
}
