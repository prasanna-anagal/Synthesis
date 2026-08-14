import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, MessageSquare, Network, BookOpen, LogOut, Folder, PanelLeftClose, PanelLeft, Trash2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store'
import { foldersApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [folders, setFolders] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user?.token) return
    foldersApi.list(user.token).then(setFolders).catch(console.error)
  }, [user?.token])

  const createFolder = async () => {
    if (!newFolderName.trim() || !user?.token) return
    setCreating(true)
    try {
      const folder = await foldersApi.create(user.token, { name: newFolderName.trim() })
      setFolders(prev => [folder, ...prev])
      setNewFolderName('')
      setShowNewFolder(false)
      navigate(`/app/folder/${folder.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const deleteFolder = async (e, folderId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user?.token || !confirm('Delete this folder and all its documents?')) return
    await foldersApi.delete(user.token, folderId)
    setFolders(prev => prev.filter(f => f.id !== folderId))
    if (location.pathname.includes(folderId)) navigate('/app')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const navItem = (to, Icon, label) => {
    const active = location.pathname === to
    return (
      <Link
        key={to}
        to={to}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
          active
            ? 'bg-indigo-50 text-indigo-600 font-semibold border-l-2 border-indigo-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen flex-shrink-0 bg-slate-50/70 backdrop-blur-md border-r border-slate-200/80 flex flex-col sticky top-0 z-30 select-none"
    >
      {/* Sidebar Header */}
      <div className={`h-14 flex items-center border-b border-slate-200/80 px-3 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link to="/app" className="flex items-center gap-2.5 text-slate-900 font-bold text-sm tracking-tight hover:opacity-90 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900">Synthesis</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <Brain className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!collapsed && (
          <>
            <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Subject Folders</span>
              <button
                onClick={() => setShowNewFolder(!showNewFolder)}
                className="p-1 rounded hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors"
                title="Create folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inline New Folder Input */}
            <AnimatePresence>
              {showNewFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-2 px-1"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                      placeholder="Folder name..."
                      className="flex-1 h-8 rounded-md border border-indigo-300 px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <button
                      onClick={createFolder}
                      disabled={creating || !newFolderName.trim()}
                      className="h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {folders.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No folders created yet.
              </div>
            )}

            {folders.map(folder => {
              const folderActive = isActive(`/app/folder/${folder.id}`)
              return (
                <div key={folder.id} className="folder-item group">
                  <Link
                    to={`/app/folder/${folder.id}`}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      folderActive
                        ? 'bg-slate-200/70 text-slate-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-200/50 hover:text-slate-900'
                    }`}
                  >
                    <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${folderActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="flex-1 truncate">{folder.name}</span>
                    <button
                      className="delete-btn p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      onClick={e => deleteFolder(e, folder.id)}
                      title="Delete folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>

                  {/* Folder Sub-nav */}
                  {folderActive && (
                    <div className="ml-5 pl-2 border-l border-slate-200 my-1 space-y-0.5">
                      {navItem(`/app/folder/${folder.id}/chat`, MessageSquare, 'Chat')}
                      {navItem(`/app/folder/${folder.id}/graph`, Network, 'Knowledge Graph')}
                      {navItem(`/app/folder/${folder.id}/quiz`, BookOpen, 'Adaptive Quiz')}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {collapsed && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={() => { setCollapsed(false); setShowNewFolder(true) }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="New Folder"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-2.5 border-t border-slate-200/80 flex-shrink-0 bg-slate-100/50">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200/70 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={signOut}
            title="Sign out"
            className="p-2 mx-auto flex text-slate-400 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.aside>
  )
}
