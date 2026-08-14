import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Bot, User, Loader2, Plus, ChevronDown, ChevronRight, FileText, Sparkles, Brain } from 'lucide-react'
import { useAuthStore } from '@/store'
import { chatApi } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { formatRelativeTime } from '@/lib/utils'

function ReasoningSteps({ steps, isStreaming }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div style={{ background: '#f5f3ff', borderRadius: 9, padding: '10px 13px', marginBottom: 10, border: '1px solid #e0e7ff' }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
        <Brain size={13} color="#6366f1" />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6366f1', flex: 1, textAlign: 'left' }}>Agent reasoning</span>
        {isStreaming && <div className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />}
        {expanded ? <ChevronDown size={12} color="#6366f1" /> : <ChevronRight size={12} color="#6366f1" />}
      </button>
      <AnimatePresence>
        {expanded && steps.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginTop: 8, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ fontSize: '0.77rem', color: '#6366f1', display: 'flex', alignItems: 'flex-start', gap: '5px', opacity: 0.85 }}>
                <span>{'›'}</span><span>{step}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CitationChip({ citation, index }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ fontSize: '0.77rem', border: '1px solid #e0e7ff', borderRadius: 7, overflow: 'hidden', marginTop: 4 }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 9px', background: '#eef2ff', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
        <FileText size={11} color="#6366f1" />
        <span style={{ color: '#6366f1', fontWeight: 600 }}>[{index + 1}] {citation.document_name}</span>
        {citation.page_number && <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>p.{citation.page_number}</span>}
        {expanded ? <ChevronDown size={11} color="#9ca3af" /> : <ChevronRight size={11} color="#9ca3af" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', fontSize: '0.77rem', color: '#6b7280', lineHeight: 1.55, borderTop: '1px solid #e0e7ff', background: '#fff', fontStyle: 'italic' }}>
              "{citation.excerpt}"
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Message({ msg, isStreaming, streamingSteps }) {
  const isUser = msg.role === 'user'
  const steps = isStreaming ? streamingSteps : (msg.reasoning_steps || [])
  const citations = msg.citations || []

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', maxWidth: '84%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isUser ? '#6366f1' : '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          {isUser ? <User size={14} color="#fff" /> : <Bot size={14} color="#6b7280" />}
        </div>
        <div style={{ flex: 1 }}>
          {!isUser && steps.length > 0 && <ReasoningSteps steps={steps} isStreaming={isStreaming} />}
          <div style={{
            padding: isUser ? '10px 14px' : '12px 16px',
            borderRadius: isUser ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
            background: isUser ? '#6366f1' : '#f9fafb',
            border: isUser ? 'none' : '1px solid #f0f0f0',
            color: isUser ? '#fff' : '#111827',
          }}>
            {isUser ? (
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55 }}>{msg.content}</p>
            ) : (
              <div className="prose" style={{ fontSize: '0.9rem' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '...'}</ReactMarkdown>
              </div>
            )}
          </div>
          {!isUser && citations.length > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sources</span>
              {citations.map((c, i) => <CitationChip key={i} citation={c} index={i} />)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Chat() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const { startStream } = useSSE()
  const messagesEndRef = useRef(null)

  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [streamingSteps, setStreamingSteps] = useState([])
  const [streamingCitations, setStreamingCitations] = useState([])

  useEffect(() => {
    if (!user?.token) return
    chatApi.listChats(user.token, folderId).then(setChats).catch(console.error)
  }, [user?.token, folderId])

  useEffect(() => {
    if (!activeChatId || !user?.token) return
    chatApi.getMessages(user.token, activeChatId).then(setMessages).catch(console.error)
  }, [activeChatId, user?.token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  const createAndSelectChat = async () => {
    if (!user?.token) return
    const chat = await chatApi.createChat(user.token, { folder_id: folderId })
    setChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setMessages([])
  }

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !user?.token) return
    let chatId = activeChatId
    if (!chatId) {
      const chat = await chatApi.createChat(user.token, { folder_id: folderId })
      setChats(prev => [chat, ...prev])
      setActiveChatId(chat.id)
      chatId = chat.id
    }

    const userMsg = { id: Date.now(), role: 'user', content: input, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)
    setStreamingMessage('')
    setStreamingSteps([])
    setStreamingCitations([])

    try {
      const response = await chatApi.sendMessage(user.token, chatId, userMsg.content, folderId)
      let fullAnswer = ''
      let finalCitations = []

      await startStream(
        response,
        ({ event, data }) => {
          if (event === 'reasoning_step') {
            setStreamingSteps(prev => [...prev, data.message])
          } else if (event === 'token') {
            fullAnswer += data.text
            setStreamingMessage(fullAnswer)
          } else if (event === 'citations') {
            finalCitations = data.citations
            setStreamingCitations(data.citations)
          } else if (event === 'done') {
            const assistantMsg = {
              id: Date.now() + 1, role: 'assistant',
              content: fullAnswer, citations: finalCitations,
              reasoning_steps: streamingSteps,
              created_at: new Date().toISOString(),
            }
            setMessages(prev => [...prev, assistantMsg])
            setIsStreaming(false)
            setStreamingMessage('')
          } else if (event === 'error') {
            setIsStreaming(false)
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Error: ${data.message}`, created_at: new Date().toISOString() }])
          }
        },
        () => { setIsStreaming(false) },
        (err) => { setIsStreaming(false); console.error(err) }
      )
    } catch (err) {
      setIsStreaming(false)
      console.error(err)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Chat history sidebar */}
      <div style={{ width: 220, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 }}>
        <div style={{ padding: '14px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Chats</span>
          <button onClick={createAndSelectChat}
            style={{ background: '#6366f1', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
            <Plus size={12} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {chats.map(chat => (
            <button key={chat.id} onClick={() => setActiveChatId(chat.id)}
              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: activeChatId === chat.id ? '#eef2ff' : 'transparent', marginBottom: 2, transition: 'background 0.12s' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: activeChatId === chat.id ? 600 : 400, color: activeChatId === chat.id ? '#6366f1' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{formatRelativeTime(chat.updated_at)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {!activeChatId && messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#9ca3af' }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} color="#6366f1" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, color: '#374151', fontSize: '1rem', marginBottom: 4 }}>Start a conversation</p>
                <p style={{ fontSize: '0.875rem' }}>Ask anything about your documents in this folder.</p>
              </div>
            </div>
          )}

          {messages.map(msg => <Message key={msg.id} msg={msg} isStreaming={false} streamingSteps={[]} />)}

          {isStreaming && (
            <Message
              msg={{ role: 'assistant', content: streamingMessage, citations: streamingCitations, created_at: new Date().toISOString() }}
              isStreaming={true}
              streamingSteps={streamingSteps}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: '#f9fafb', borderRadius: 12, border: '1.5px solid #e5e7eb', padding: '10px 14px', transition: 'border-color 0.15s' }}
            onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
            onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask a question about your documents... (Enter to send, Shift+Enter for newline)"
              rows={1}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: '0.9rem', color: '#111827', lineHeight: 1.55, fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto' }}
            />
            <button onClick={sendMessage} disabled={isStreaming || !input.trim()}
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: isStreaming || !input.trim() ? '#e5e7eb' : '#6366f1', color: isStreaming || !input.trim() ? '#9ca3af' : '#fff', cursor: isStreaming || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
              {isStreaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', marginTop: '6px' }}>
            Agent will reason across your uploaded documents and cite sources
          </p>
        </div>
      </div>
    </div>
  )
}
