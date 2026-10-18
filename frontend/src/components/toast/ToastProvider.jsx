import { useCallback, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { ToastContext } from './toastContext'

const TOAST_DURATION_MS = 5000

const TOAST_ICONS = {
  success: CheckCircle2,
  error: CircleAlert,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const show = useCallback(
    (kind, message) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, kind, message }])
      setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.kind]
          return (
            <div key={toast.id} className={`toast toast-${toast.kind}`}>
              <Icon aria-hidden="true" />
              <span>{toast.message}</span>
              <button
                type="button"
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
