import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useToast } from './toast/toastContext'

const COPIED_FEEDBACK_MS = 1500

export function CopyButton({ text, label = 'Copy' }) {
  const [hasCopied, setHasCopied] = useState(false)
  const toast = useToast()

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      toast.error('Copying is not available in this browser context.')
    }
  }

  return (
    <button type="button" className="button button-small" onClick={copyText}>
      {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {hasCopied ? 'Copied' : label}
    </button>
  )
}
