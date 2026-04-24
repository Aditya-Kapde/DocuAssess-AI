const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api/v1';

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

/**
 * POST /api/v1/upload — upload a PDF file
 * @param {File} file
 * @returns {Promise<object>} { success, fileId, meta, message, warning? }
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(res);
}

/**
 * POST /api/v1/generate — generate questions from uploaded file
 * Backend expects: { fileId, questionConfig: Record<string, number> }
 *
 * @param {object} params
 * @param {string} params.fileId
 * @param {Record<string, number>} params.questionConfig - e.g. { mcq: 5, true_false: 3 }
 * @returns {Promise<object>} { success, questions, meta }
 */
export async function generateQuestions({ fileId, questionConfig }) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, questionConfig }),
  });

  return handleResponse(res);
}

/**
 * GET /api/v1/health — server health check
 */
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}
