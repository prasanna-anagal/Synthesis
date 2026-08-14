import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, MessageSquare, Network, BookOpen, LogOut, Folder, PanelLeftClose, PanelLeft, Trash2, FileText } from 'lucide-react'
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
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const deleteFolder = async (e, folderId) => {
    e.preventDefault(); e.stopPropagation()
    if (!user?.token || !confirm('Delete this folder and all its documents?')) return
    await foldersApi.delete(user.token, folderId)
    setFolders(prev => prev.filter(f => f.id !== folderId))
    if (location.pathname.includes(folderId)) navigate('/app')
  }

  const signOut = async () => { await supabase.auth.signOut(); navigate('/') }
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const navItem = (to, Icon, label) => (
    <Link key={to} to={to} style={{
      display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px',
      borderRadius: 6, textDecoration: 'none', fontSize: '0.8rem',
      color: isActive(to) ? '#6366f1' : '#6b7280',
      fontWeight: isActive(to) ? 600 : 400,
      background: isActive(to) ? '#eef2ff' : 'transparent',
    }}>
      <Icon size={12} /> {label}
    </Link>
  )

  return (
    <motion.aside animate={{ width: collapsed ? 56 : 260 }} transition={{ duration: 0.2 }}
      style={{ height: '100vh', flexShrink: 0, overflow: 'hidden', background: '#fafafa', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0 }}>
      
      {/* Header */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '0 12px' : '0 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        {!collapsed && (
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}>
            <div style={{ width: 27, height: 27, borderRadius: 7, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={14} color="#fff" /></div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', letterSpacing: '-0.02em' }}>Synthesis</span>
          </Link>
        )}
        {collapsed && <div style={{ width: 27, height: 27, borderRadius: 7, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={14} color="#fff" /></div>}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 5, display: 'flex', alignItems: 'center' }}>
          {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: collapsed ? '10px 7px' : '10px' }}>
        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Folders</span>
              <button onClick={() => setShowNewFolder(!showNewFolder)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, borderRadius: 4, display: 'flex' }}>
                <Plus size={13} />
              </button>
            </div>

            <AnimatePresence>
              {showNewFolder && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ padding: '3px 8px', display: 'flex', gap: '5px' }}>
                    <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                      placeholder="Folder name..." style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid #6366f1', padding: '0 8px', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={createFolder} disabled={creating || !newFolderName.trim()}
                      style={{ height: 30, padding: '0 9px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {folders.length === 0 && (
              <p style={{ padding: '10px 8px', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center' }}>
                No folders yet
              </p>
            )}

            {folders.map(folder => (
              <div key={folder.id} className="folder-item">
                <Link to={`/app/folder/${folder.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px',
                  borderRadius: 7, textDecoration: 'none', marginBottom: 2,
                  background: isActive(`/app/folder/${folder.id}`) ? '#eef2ff' : 'transparent',
                  color: isActive(`/app/folder/${folder.id}`) ? '#6366f1' : '#374151',
                  fontSize: '0.855rem', fontWeight: isActive(`/app/folder/${folder.id}`) ? 600 : 400,
                  transition: 'background 0.12s',
                }}>
                  <Folder size={13} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                  <button className="delete-btn" onClick={e => deleteFolder(e, folder.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', display: 'flex', alignItems: 'center', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                    <Trash2 size={11} />
                  </button>
                </Link>
                {isActive(`/app/folder/${folder.id}`) && (
                  <div style={{ marginLeft: '20px', marginBottom: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {navItem(`/app/folder/${folder.id}/chat`, MessageSquare, 'Chat')}
                    {navItem(`/app/folder/${folder.id}/graph`, Network, 'Graph')}
                    {navItem(`/app/folder/${folder.id}/quiz`, BookOpen, 'Quiz')}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: collapsed ? '10px 7px' : '10px', flexShrink: 0 }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px', borderRadius: 8, background: '#f3f4f6' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
            <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, display: 'flex' }}>
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 6, display: 'flex', margin: '0 auto' }}>
            <LogOut size={16} />
          </button>
        )}
      </div>
    </motion.aside>
  )
}
