const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
})

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const RELATIVE_TIME_UNITS = [
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
]

export function formatDateTime(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return dateTimeFormatter.format(date)
}

export function formatRelativeTime(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'

  const elapsedSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const match = RELATIVE_TIME_UNITS.find(({ seconds }) => Math.abs(elapsedSeconds) >= seconds)
  if (!match) return relativeTimeFormatter.format(elapsedSeconds, 'second')

  return relativeTimeFormatter.format(Math.round(elapsedSeconds / match.seconds), match.unit)
}

const numberFormatter = new Intl.NumberFormat()

export function formatNumber(value) {
  return numberFormatter.format(value)
}
