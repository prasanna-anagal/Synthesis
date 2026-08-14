import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import AppShell from '@/components/layout/AppShell'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import FolderView from '@/pages/FolderView'
import Chat from '@/pages/Chat'
import Graph from '@/pages/Graph'
import Quiz from '@/pages/Quiz'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected app routes */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="folder/:folderId" element={<FolderView />} />
            <Route path="folder/:folderId/chat" element={<Chat />} />
            <Route path="folder/:folderId/graph" element={<Graph />} />
            <Route path="folder/:folderId/quiz" element={<Quiz />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
