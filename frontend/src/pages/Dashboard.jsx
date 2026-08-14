import { Brain, FolderOpen, MessageSquare, Network, BookOpen, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'

export default function Dashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '48px 40px', maxWidth: '860px' }}>
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>{greeting}</p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>
          Welcome to Synthesis
        </h1>
        <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '0.95rem' }}>
          Create a folder in the sidebar and upload your documents to get started.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {[
          { icon: FolderOpen, title: 'Create a Folder', desc: 'Organize your documents by subject or course.', color: '#eef2ff', iconColor: '#6366f1' },
          { icon: MessageSquare, title: 'Chat with Docs', desc: 'Ask questions across multiple documents at once.', color: '#f0fdf4', iconColor: '#16a34a' },
          { icon: Network, title: 'Knowledge Graph', desc: 'Visualize concept connections across your files.', color: '#fdf4ff', iconColor: '#9333ea' },
          { icon: BookOpen, title: 'Adaptive Quiz', desc: 'Test your knowledge with AI-generated quizzes.', color: '#fff7ed', iconColor: '#ea580c' },
        ].map(card => (
          <div key={card.title} style={{ padding: '20px', borderRadius: 12, border: '1px solid #f3f4f6', background: '#fafafa' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <card.icon size={18} color={card.iconColor} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{card.title}</h3>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.55 }}>{card.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: 14, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>Ready to get started?</h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>Click the + icon in the sidebar to create your first folder.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 16px' }}>
          <Brain size={16} color="#fff" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Start with a folder →</span>
        </div>
      </div>
    </div>
  )
}
