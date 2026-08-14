import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Upload, FileText, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2, Clock, MessageSquare, Network, BookOpen, X } from 'lucide-react'
import { useAuthStore } from '@/store'
import { documentsApi, foldersApi } from '@/lib/api'
import { formatBytes, formatRelativeTime, getFileIcon } from '@/lib/utils'

const statusIcon = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  processing: <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />,
  indexed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  error: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
}

const statusBadge = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  indexed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function FolderView() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const [folder, setFolder] = useState(null)
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState(null)

  const fetchDocuments = useCallback(async () => {
    if (!user?.token) return
    try {
      const docs = await documentsApi.list(user.token, folderId)
      setDocuments(docs)
    } catch (e) {
      console.error(e)
    }
  }, [user?.token, folderId])

  useEffect(() => {
    if (!user?.token) return
    Promise.all([
      foldersApi.get(user.token, folderId).then(setFolder),
      fetchDocuments(),
    ]).finally(() => setLoading(false))
  }, [user?.token, folderId, fetchDocuments])

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
      setUploading(prev => [...prev, { id: uploadId, name: file.name }])
      try {
        await documentsApi.upload(user.token, folderId, file)
        toast.success(`Uploaded ${file.name}. Processing started...`)
        await fetchDocuments()
      } catch (e) {
        toast.error(`Upload failed: ${e.message}`)
      } finally {
        setUploading(prev => prev.filter(u => u.id !== uploadId))
      }
    }
  }, [user?.token, folderId, fetchDocuments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024,
  })

  const deleteDocument = async (e, docId, docName) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user?.token || !confirm(`Delete "${docName}"?`)) return
    try {
      await documentsApi.delete(user.token, folderId, docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      if (selectedDoc?.id === docId) setSelectedDoc(null)
      toast.success(`Deleted ${docName}`)
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2.5 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading folder...
      </div>
    )
  }

  const indexedCount = documents.filter(d => d.status === 'indexed').length

  return (
    <div className="p-10 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
              {folder?.name || 'Folder'}
            </h1>
            <p className="text-sm text-slate-500">
              {indexedCount} of {documents.length} document(s) ready for semantic RAG search
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDocuments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Quick nav bar */}
        <div className="flex gap-2 mt-5">
          {[
            { to: `/app/folder/${folderId}/chat`, icon: MessageSquare, label: 'Chat' },
            { to: `/app/folder/${folderId}/graph`, icon: Network, label: 'Knowledge Graph' },
            { to: `/app/folder/${folderId}/quiz`, icon: BookOpen, label: 'Adaptive Quiz' },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100/80 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200/80 hover:border-indigo-200 transition-all"
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50/60'
            : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-8 h-8 mx-auto mb-2.5 ${isDragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
        <p className={`font-bold text-sm mb-1 ${isDragActive ? 'text-indigo-600' : 'text-slate-800'}`}>
          {isDragActive ? 'Drop files here to upload' : 'Drag & drop PDF, DOCX, or TXT files here'}
        </p>
        <p className="text-xs text-slate-400">Files up to 50MB each · Preserves page numbers for citations</p>
      </div>

      {/* Uploading Queue */}
      <AnimatePresence>
        {uploading.map(u => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 p-3 mt-3 rounded-xl bg-indigo-50/90 border border-indigo-200/80 text-xs text-indigo-900 font-medium"
          >
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Uploading & parsing {u.name}...</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Documents List */}
      <div className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Documents ({documents.length})
        </h2>

        {documents.length === 0 && uploading.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50/40 rounded-2xl border border-slate-200/70">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedDoc(doc)}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-2xs transition-all cursor-pointer group"
              >
                <span className="text-xl flex-shrink-0">{getFileIcon(doc.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatBytes(doc.file_size)} {doc.page_count ? `· ${doc.page_count} pages` : ''} · {formatRelativeTime(doc.created_at)}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold capitalize flex-shrink-0 ${statusBadge[doc.status]}`}>
                  {statusIcon[doc.status]}
                  <span>{doc.status}</span>
                </div>
                <button
                  type="button"
                  onClick={e => deleteDocument(e, doc.id, doc.filename)}
                  title="Delete document"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Document Details Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{getFileIcon(selectedDoc.file_type)}</span>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Document Metadata</h3>
                    <p className="text-xs text-slate-400">ID: {selectedDoc.id.slice(0, 8)}...</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 pt-3 border-t border-slate-100">
                <div className="flex justify-between"><span className="text-slate-400">Filename:</span><span className="font-semibold truncate max-w-60">{selectedDoc.filename}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Type:</span><span className="font-semibold uppercase">{selectedDoc.file_type}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Size:</span><span className="font-semibold">{formatBytes(selectedDoc.file_size)}</span></div>
                {selectedDoc.page_count && <div className="flex justify-between"><span className="text-slate-400">Pages:</span><span className="font-semibold">{selectedDoc.page_count}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">Status:</span><span className="font-semibold capitalize">{selectedDoc.status}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Uploaded:</span><span className="font-semibold">{formatRelativeTime(selectedDoc.created_at)}</span></div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
