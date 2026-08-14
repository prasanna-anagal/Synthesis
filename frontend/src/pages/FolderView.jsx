import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2, Clock, MessageSquare, Network, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/store'
import { documentsApi, foldersApi } from '@/lib/api'
import { formatBytes, formatRelativeTime, getFileIcon } from '@/lib/utils'

const statusIcon = {
  pending: <Clock size={13} color="#f59e0b" />,
  processing: <Loader2 size={13} color="#6366f1" className="animate-spin" />,
  indexed: <CheckCircle2 size={13} color="#22c55e" />,
  error: <XCircle size={13} color="#ef4444" />,
}

const statusLabel = {
  pending: 'Pending',
  processing: 'Processing...',
  indexed: 'Ready',
  error: 'Error',
}

export default function FolderView() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const [folder, setFolder] = useState(null)
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    if (!user?.token) return
    try {
      const docs = await documentsApi.list(user.token, folderId)
      setDocuments(docs)
    } catch (e) { console.error(e) }
  }, [user?.token, folderId])

  useEffect(() => {
    if (!user?.token) return
    Promise.all([
      foldersApi.get(user.token, folderId).then(setFolder),
      fetchDocuments(),
    ]).finally(() => setLoading(false))
  }, [user?.token, folderId, fetchDocuments])

  // Poll processing documents
  useEffect(() => {
    const processingDocs = documents.filter(d => d.status === 'pending' || d.status === 'processing')
    if (!processingDocs.length) return
    const interval = setInterval(fetchDocuments, 3000)
    return () => clearInterval(interval)
  }, [documents, fetchDocuments])

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!user?.token) return
    for (const file of acceptedFiles) {
      const uploadId = `${file.name}-${Date.now()}`
      setUploading(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }])
      try {
        await documentsApi.upload(user.token, folderId, file)
        await fetchDocuments()
      } catch (e) {
        console.error('Upload failed:', e)
      } finally {
        setUploading(prev => prev.filter(u => u.id !== uploadId))
      }
    }
  }, [user?.token, folderId, fetchDocuments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxSize: 50 * 1024 * 1024,
  })

  const deleteDocument = async (docId) => {
    if (!user?.token || !confirm('Delete this document?')) return
    await documentsApi.delete(user.token, folderId, docId)
    setDocuments(prev => prev.filter(d => d.id !== docId))
  }

  if (loading) return <div style={{ padding: 40, display: 'flex', alignItems: 'center', gap: 10, color: '#9ca3af' }}><Loader2 size={18} className="animate-spin" /> Loading...</div>

  return (
    <div style={{ padding: '36px 40px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827', marginBottom: '6px' }}>
          {folder?.name || 'Folder'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {documents.filter(d => d.status === 'indexed').length} document(s) indexed
        </p>

        {/* Quick nav */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {[
            { to: `/app/folder/${folderId}/chat`, icon: MessageSquare, label: 'Chat' },
            { to: `/app/folder/${folderId}/graph`, icon: Network, label: 'Graph' },
            { to: `/app/folder/${folderId}/quiz`, icon: BookOpen, label: 'Quiz' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '6px 14px', borderRadius: 7, fontSize: '0.83rem',
              background: '#f3f4f6', color: '#374151', textDecoration: 'none',
              fontWeight: 500, border: '1px solid #e5e7eb',
              transition: 'background 0.12s',
            }}>
              <item.icon size={13} /> {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div {...getRootProps()} style={{
        border: `2px dashed ${isDragActive ? '#6366f1' : '#e5e7eb'}`,
        borderRadius: 12, padding: '36px 24px', textAlign: 'center',
        background: isDragActive ? '#eef2ff' : '#fafafa',
        cursor: 'pointer', transition: 'all 0.15s', marginBottom: '28px',
      }}>
        <input {...getInputProps()} />
        <Upload size={28} color={isDragActive ? '#6366f1' : '#9ca3af'} style={{ margin: '0 auto 10px' }} />
        <p style={{ fontWeight: 600, color: isDragActive ? '#6366f1' : '#374151', marginBottom: 4, fontSize: '0.95rem' }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>PDF, DOCX, TXT — up to 50MB each</p>
      </div>

      {/* Uploading queue */}
      <AnimatePresence>
        {uploading.map(u => (
          <motion.div key={u.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 9, background: '#eef2ff', border: '1px solid #c7d2fe', marginBottom: 8 }}>
            <Loader2 size={15} color="#6366f1" className="animate-spin" />
            <span style={{ flex: 1, fontSize: '0.85rem', color: '#374151' }}>Uploading {u.name}...</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Documents list */}
      {documents.length === 0 && uploading.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
          <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.875rem' }}>No documents yet — upload your first file above</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Documents</h2>
          {documents.map(doc => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: 10, border: '1px solid #f3f4f6', background: '#fff', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <span style={{ fontSize: '1.25rem' }}>{getFileIcon(doc.file_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {formatBytes(doc.file_size)} {doc.page_count ? `· ${doc.page_count} pages` : ''} · {formatRelativeTime(doc.created_at)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {statusIcon[doc.status]}
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{statusLabel[doc.status]}</span>
              </div>
              {doc.status === 'error' && (
                <button onClick={fetchDocuments} title="Retry" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={13} />
                </button>
              )}
              <button onClick={() => deleteDocument(doc.id)} title="Delete"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', display: 'flex', alignItems: 'center', borderRadius: 5, transition: 'color 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
