import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { Send, Bot, User, Loader2, Plus, ChevronDown, ChevronRight, FileText, Sparkles, Brain, Copy, Check, Trash2, ArrowDown } from 'lucide-react'
import { useAuthStore } from '@/store'
import { chatApi } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'
import { formatRelativeTime } from '@/lib/utils'

function ReasoningSteps({ steps, isStreaming }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3.5 mb-3 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left font-bold text-indigo-700 hover:text-indigo-900"
      >
        <Brain className="w-3.5 h-3.5 text-indigo-600" />
        <span className="flex-1">Agent Multi-Step Reasoning</span>
        {isStreaming && <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />}
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
      </button>

      <AnimatePresence>
        {expanded && steps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2.5 space-y-1 pl-1"
          >
            {steps.map((step, i) => (
              <div key={i} className="text-[11px] text-indigo-800 flex items-start gap-1.5 opacity-90">
                <span className="font-bold text-indigo-500">›</span>
                <span>{step}</span>
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
    <div className="text-xs border border-indigo-100 rounded-lg overflow-hidden mt-1.5 shadow-2xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 bg-indigo-50/60 hover:bg-indigo-100/60 text-left font-semibold text-indigo-700 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        <span className="truncate flex-1">[{index + 1}] {citation.document_name}</span>
        {citation.page_number && <span className="text-[11px] text-slate-400 font-normal">p.{citation.page_number}</span>}
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-2.5 text-xs text-slate-600 italic bg-white border-t border-indigo-100 leading-relaxed">
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
  const [copied, setCopied] = useState(false)

  const copyContent = () => {
    navigator.clipboard.writeText(msg.content || '')
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col mb-6 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          {!isUser && steps.length > 0 && <ReasoningSteps steps={steps} isStreaming={isStreaming} />}
          <div className={`relative p-4 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-xs shadow-xs font-medium'
              : 'bg-slate-50 border border-slate-200/80 text-slate-900 rounded-2xl rounded-tl-xs shadow-2xs'
          }`}>
            {isUser ? (
              <p className="m-0">{msg.content}</p>
            ) : (
              <div className="prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '...'}</ReactMarkdown>
              </div>
            )}
            {!isUser && msg.content && (
              <button
                onClick={copyContent}
                title="Copy response"
                className="absolute top-2.5 right-2.5 p-1 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-slate-700 shadow-2xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {!isUser && citations.length > 0 && (
            <div className="mt-2.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citations</span>
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
  const chatContainerRef = useRef(null)

  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [streamingSteps, setStreamingSteps] = useState([])
  const [streamingCitations, setStreamingCitations] = useState([])
  const [showScrollBottom, setShowScrollBottom] = useState(false)

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

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150)
  }

  const createAndSelectChat = async () => {
    if (!user?.token) return
    const chat = await chatApi.createChat(user.token, { folder_id: folderId })
    setChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setMessages([])
    toast.success('New chat session started')
  }

  const deleteChatSession = async (e, chatId) => {
    e.stopPropagation()
    if (!user?.token || !confirm('Delete chat?')) return
    await chatApi.deleteChat(user.token, chatId)
    setChats(prev => prev.filter(c => c.id !== chatId))
    if (activeChatId === chatId) {
      setActiveChatId(null)
      setMessages([])
    }
    toast.success('Chat deleted')
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
            toast.error(`Agent error: ${data.message}`)
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Error: ${data.message}`, created_at: new Date().toISOString() }])
          }
        },
        () => { setIsStreaming(false) },
        (err) => { setIsStreaming(false); toast.error('Streaming connection interrupted'); console.error(err) }
      )
    } catch (err) {
      setIsStreaming(false)
      toast.error(err.message || 'Failed to send message')
      console.error(err)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Chat History Panel */}
      <div className="w-56 border-r border-slate-200/80 bg-slate-50/50 flex flex-col flex-shrink-0">
        <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Chat History</span>
          <button
            onClick={createAndSelectChat}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map(chat => (
            <div key={chat.id} className="folder-item relative flex items-center">
              <button
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors pr-7 ${
                  activeChatId === chat.id
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <div className="truncate font-medium">{chat.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{formatRelativeTime(chat.updated_at)}</div>
              </button>
              <button
                onClick={e => deleteChatSession(e, chat.id)}
                className="delete-btn absolute right-2 p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-8 space-y-6">
          {!activeChatId && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-base">Multi-Document RAG Chat</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">Ask questions across all indexed files in this folder.</p>
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

        {/* Scroll Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-24 right-8 bg-white border border-slate-200 p-2.5 rounded-full shadow-lg text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200/80 bg-white">
          <div className="flex items-end gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask a question across folder documents... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-slate-900 placeholder:text-slate-400 max-h-32"
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center flex-shrink-0 transition-colors shadow-2xs"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            AI Agent will reason across files and provide inline page citations
          </p>
        </div>
      </div>
    </div>
  )
}
