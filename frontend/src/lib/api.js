import { supabase } from '@/lib/supabase'

const RAW_API_URL = import.meta.env.VITE_API_BASE_URL
const BASE_URL = (RAW_API_URL && RAW_API_URL.trim() !== '')
  ? `${RAW_API_URL.replace(/\/$/, '')}/api`
  : '/api'

async function request(path, options = {}, token) {
  let authToken = token
  if (!authToken) {
    try {
      const { data } = await supabase.auth.getSession()
      authToken = data?.session?.access_token
    } catch (e) {
      console.warn('Could not retrieve Supabase session token:', e)
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const res = await fetch(`${BASE_URL}${cleanPath}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed with status ${res.status}`)
  }
  if (res.status === 204) return undefined
  return res.json()
}

// ── Folders ───────────────────────────────────────────────────────────────────
export const foldersApi = {
  list: (token) => request('/folders', {}, token),
  create: (token, data) => request('/folders', { method: 'POST', body: JSON.stringify(data) }, token),
  update: (token, id, data) => request(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  delete: (token, id) => request(`/folders/${id}`, { method: 'DELETE' }, token),
  get: (token, id) => request(`/folders/${id}`, {}, token),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: (token, folderId) => request(`/documents/${folderId}`, {}, token),
  upload: async (token, folderId, file) => {
    let authToken = token
    if (!authToken) {
      const { data } = await supabase.auth.getSession()
      authToken = data?.session?.access_token
    }
    const form = new FormData()
    form.append('file', file)
    const headers = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    const res = await fetch(`${BASE_URL}/documents/${folderId}/upload`, {
      method: 'POST',
      headers,
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
    request(`/chat${folderId ? `?folder_id=${folderId}` : ''}`, {}, token),
  createChat: (token, data) =>
    request('/chat', { method: 'POST', body: JSON.stringify(data) }, token),
  getMessages: (token, chatId) =>
    request(`/chat/${chatId}/messages`, {}, token),
  deleteChat: (token, chatId) =>
    request(`/chat/${chatId}`, { method: 'DELETE' }, token),
  /** Returns raw Response for SSE streaming */
  sendMessage: async (token, chatId, content, folderId) => {
    let authToken = token
    if (!authToken) {
      const { data } = await supabase.auth.getSession()
      authToken = data?.session?.access_token
    }
    const headers = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    return fetch(`${BASE_URL}/chat/${chatId}/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chat_id: chatId, content, folder_id: folderId }),
    })
  },
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
