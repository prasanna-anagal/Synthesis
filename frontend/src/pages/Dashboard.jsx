import { Brain, FolderOpen, MessageSquare, Network, BookOpen, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'

export default function Dashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-10 max-w-4xl">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{greeting}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome to Synthesis
        </h1>
        <p className="text-slate-600 mt-2 text-sm">
          Select or create a folder in the left sidebar to upload documents and begin agentic research.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {[
          { icon: FolderOpen, title: 'Create Folders', desc: 'Group documents by subject, course, or project.', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
          { icon: MessageSquare, title: 'Multi-Doc Chat', desc: 'Ask questions that cross-reference all files in a folder.', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
          { icon: Network, title: 'Knowledge Graph', desc: 'Visualize dynamic entity relationships across files.', color: 'bg-purple-50 text-purple-600 border-purple-100' },
          { icon: BookOpen, title: 'Adaptive Quiz', desc: 'Test retention with AI quizzes that adjust difficulty.', color: 'bg-amber-50 text-amber-600 border-amber-100' },
        ].map(card => (
          <div key={card.title} className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-lg border ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">{card.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-7 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-indigo-200">
        <div>
          <h2 className="text-lg font-bold mb-1">Get Started Now</h2>
          <p className="text-xs text-indigo-100">Click the + icon in the left sidebar to add your first folder.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg text-xs font-bold border border-white/20">
          <Brain className="w-4 h-4 text-white" />
          <span>Multi-Doc RAG Ready</span>
        </div>
      </div>
    </div>
  )
}
