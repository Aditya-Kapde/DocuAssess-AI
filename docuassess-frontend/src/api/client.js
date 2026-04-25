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

/**
 * POST /api/v1/export — export questions as downloadable JSON
 * @param {Array} questions — flat array of generated questions
 * @returns {Promise<void>} — triggers a file download in the browser
 */
export async function exportQuestions(questions) {
  const res = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message || `Export failed (${res.status})`);
  }

  // Extract filename from Content-Disposition header, or use fallback
  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename=(.+)/);
  const filename = filenameMatch ? filenameMatch[1] : `questions_${Date.now()}.json`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
