import { useState } from 'react'
import { CircleAlert, LoaderCircle, Plus, Send, Trash2 } from 'lucide-react'
import { createBatch } from '../api/jobProcessorApi'
import { useToast } from './toast/toastContext'

function createEmptyInput() {
  return { id: crypto.randomUUID(), text: '' }
}

function formatSubmitLabel(jobCount) {
  if (jobCount === 0) return 'Submit batch'
  return `Submit ${jobCount} ${jobCount === 1 ? 'job' : 'jobs'}`
}

export function BatchForm({ onCreated }) {
  const [inputs, setInputs] = useState(() => [createEmptyInput()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const toast = useToast()

  const filledInputs = inputs.map((input) => input.text.trim()).filter(Boolean)
  const canSubmit = filledInputs.length > 0 && !isSubmitting

  function updateInput(inputId, text) {
    setInputs((current) => current.map((input) => (input.id === inputId ? { ...input, text } : input)))
  }

  function removeInput(inputId) {
    setInputs((current) => current.filter((input) => input.id !== inputId))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const batch = await createBatch(filledInputs)
      toast.success(`Batch #${batch.id} created with ${batch.total_jobs} job(s).`)
      setInputs([createEmptyInput()])
      onCreated(batch)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} aria-labelledby="batch-form-title">
      <div className="stack">
        <h2 id="batch-form-title">Submit a batch</h2>
        <p className="text-secondary">
          Each input becomes one job that a worker sends to Gemini. Empty inputs are ignored.
        </p>
      </div>

      {inputs.map((input, index) => (
        <div key={input.id} className="field">
          <label htmlFor={`job-input-${input.id}`}>Job {index + 1}</label>
          <div className="field-row">
            <textarea
              id={`job-input-${input.id}`}
              rows={3}
              value={input.text}
              placeholder="e.g. Summarize this paragraph in two sentences…"
              aria-invalid={submitError ? 'true' : undefined}
              aria-describedby={submitError ? 'batch-form-error' : undefined}
              onChange={(event) => updateInput(input.id, event.target.value)}
            />
            {inputs.length > 1 && (
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove job ${index + 1}`}
                onClick={() => removeInput(input.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ))}

      {submitError && (
        <p id="batch-form-error" className="field-error" role="alert">
          <CircleAlert aria-hidden="true" />
          {submitError} Your inputs are kept, so you can try again.
        </p>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="button"
          onClick={() => setInputs((current) => [...current, createEmptyInput()])}
        >
          <Plus aria-hidden="true" />
          Add job
        </button>
        <button type="submit" className="button button-primary" disabled={!canSubmit}>
          {isSubmitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          {isSubmitting ? 'Submitting…' : formatSubmitLabel(filledInputs.length)}
        </button>
      </div>
    </form>
  )
}
