import api from './api'

export const ACTIVE_PDF_JOB_STATUSES = new Set(['queued', 'running', 'cancelling'])
export const TERMINAL_PDF_JOB_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])

export const isPdfGenerationJobActive = (job) =>
  Boolean(job && ACTIVE_PDF_JOB_STATUSES.has(job.status))

export const startPdfGenerationJob = async (etsyOrderId) => {
  const { data } = await api.post(`/orders/group/${encodeURIComponent(etsyOrderId)}/generate-pdf-job`)
  return data.job
}

export const listPdfGenerationJobs = async () => {
  const { data } = await api.get('/orders/pdf-generation-jobs')
  return data.jobs || []
}

export const cancelPdfGenerationJob = async (jobId) => {
  const { data } = await api.post(`/orders/pdf-generation-jobs/${encodeURIComponent(jobId)}/cancel`)
  return data.job
}
