const BASE_URL = '/api'

async function request(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return undefined
  return res.json()
}

// ── Folders ───────────────────────────────────────────────────────────────────
export const foldersApi = {
  list: (token) => request('/folders/', {}, token),
  create: (token, data) => request('/folders/', { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`/folders/${id}`, { method: 'DELETE' }, token),
  get: (token, id) => request(`/folders/${id}`, {}, token),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (token, folderId) => request(`/documents/${folderId}`, {}, token),
  upload: async (token, folderId, file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE_URL}/documents/${folderId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },
  status: (token, folderId, documentId) =>
    request(`/documents/${folderId}/${documentId}/status`, {}, token),
  delete: (token, folderId, documentId) =>
    request(`/documents/${folderId}/${documentId}`, { method: 'DELETE' }, token),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  listChats: (token, folderId) =>
    request(`/chat/${folderId ? `?folder_id=${folderId}` : ''}`, {}, token),
  createChat: (token, data) =>
    request('/chat/', { method: 'POST', body: JSON.stringify(data) }, token),
  getMessages: (token, chatId) =>
    request(`/chat/${chatId}/messages`, {}, token),
  deleteChat: (token, chatId) =>
    request(`/chat/${chatId}`, { method: 'DELETE' }, token),
  /** Returns raw Response for SSE streaming */
  sendMessage: (token, chatId, content, folderId) =>
    fetch(`${BASE_URL}/chat/${chatId}/message`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, content, folder_id: folderId }),
    }),
}

// ── Graph ─────────────────────────────────────────────────────────────────────
export const graphApi = {
  get: (token, folderId, forceRefresh = false) =>
    request(`/graph/${folderId}${forceRefresh ? '?force_refresh=true' : ''}`, {}, token),
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
export const quizApi = {
  generate: (token, folderId, numQuestions = 10, difficulty = 'medium') =>
    request('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ folder_id: folderId, num_questions: numQuestions, difficulty }),
    }, token),
  submit: (token, attemptId, questionId, selectedIndex) =>
    request('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ attempt_id: attemptId, question_id: questionId, selected_index: selectedIndex }),
    }, token),
  complete: (token, attemptId) =>
    request(`/quiz/${attemptId}/complete`, { method: 'POST' }, token),
  history: (token, folderId) =>
    request(`/quiz/history/${folderId}`, {}, token),
}
