import { ApiError, request } from './client'

function expectArray(payload, description) {
  if (!Array.isArray(payload)) {
    throw new ApiError(`Unexpected API response: ${description} should be a list.`)
  }
  return payload
}

function expectObject(payload, description) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(`Unexpected API response: ${description} should be an object.`)
  }
  return payload
}

export async function fetchHealth() {
  return expectObject(await request('/health'), 'health')
}

export async function fetchBatches({ limit = 50 } = {}) {
  const payload = await request('/batches', { params: { limit } })
  return expectArray(payload, 'batches')
}

export async function fetchBatch(batchId) {
  return expectObject(await request(`/batches/${batchId}`), 'batch')
}

export async function fetchBatchJobs(batchId) {
  const payload = await request(`/batches/${batchId}/jobs`)
  return expectArray(payload, 'batch jobs')
}

export async function fetchJobs({ status, batchId, limit = 200 } = {}) {
  const payload = await request('/jobs', {
    params: { status, batch_id: batchId, limit },
  })
  return expectArray(payload, 'jobs')
}

export async function createBatch(inputs) {
  const body = { jobs: inputs.map((inputData) => ({ input_data: inputData })) }
  return expectObject(await request('/batches', { method: 'POST', body }), 'created batch')
}
