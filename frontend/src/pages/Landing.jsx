import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, FileText, Network, Zap, ChevronRight, BookOpen, Search, MessageSquare, Star } from 'lucide-react'

const features = [
  { icon: Brain, title: 'Agentic Reasoning', description: 'Multi-step AI that plans, retrieves, evaluates and synthesizes — not just keyword search.' },
  { icon: Search, title: 'Cross-Document Search', description: 'Ask questions that span multiple documents. The agent decides exactly where to look.' },
  { icon: FileText, title: 'Precise Citations', description: 'Every answer cites the exact document and page number so you can verify instantly.' },
  { icon: Network, title: 'Knowledge Graph', description: 'Interactive concept map showing how ideas connect across all your uploaded documents.' },
  { icon: BookOpen, title: 'Adaptive Quizzes', description: 'AI-generated quizzes that adjust difficulty based on your performance.' },
  { icon: Zap, title: 'Live Reasoning Stream', description: 'Watch the agent think in real time — see which documents it searches and why.' },
]

const steps = [
  { number: '01', title: 'Upload Documents', desc: 'Drag and drop PDFs, DOCX, or TXT files into subject folders.' },
  { number: '02', title: 'AI Builds Knowledge Base', desc: 'Documents are parsed, chunked, and indexed for semantic search.' },
  { number: '03', title: 'Ask Anything', desc: 'The agent reasons across all documents and returns cited answers.' },
  { number: '04', title: 'Master the Material', desc: 'Explore the knowledge graph, take adaptive quizzes, track mastery.' },
]

const testimonials = [
  { name: 'Arjun M.', role: 'Final Year CS Student', text: 'I uploaded 12 research papers and got cross-referenced answers with exact citations. Absolutely game-changing for my thesis.' },
  { name: 'Priya S.', role: 'GATE Aspirant', text: 'The adaptive quiz feature actually adjusts to my weak areas. My scores improved 40% in two weeks.' },
  { name: 'Rahul K.', role: 'MBA Student', text: 'The knowledge graph made connections I never noticed across my case studies. This is how studying should work.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '60px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#111827' }}>Synthesis</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/login" style={{ padding: '7px 16px', borderRadius: 7, fontSize: '0.9rem', color: '#374151', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          <Link to="/signup" style={{ padding: '7px 18px', borderRadius: 7, fontSize: '0.9rem', background: '#6366f1', color: '#fff', textDecoration: 'none', fontWeight: 600, boxShadow: '0 1px 3px rgba(99,102,241,0.35)' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '96px 24px 80px', textAlign: 'center', background: 'linear-gradient(180deg, #f5f3ff 0%, #fff 100%)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eef2ff', color: '#6366f1', borderRadius: 100, padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '24px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            <Star size={11} fill="#6366f1" /> AI-Powered Research Agent
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#111827', margin: '0 auto 20px', maxWidth: '800px' }}>
            Your documents,{' '}
            <span style={{ color: '#6366f1' }}>intelligently connected</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.65 }}>
            Upload PDFs, papers, and notes. Synthesis reasons across all of them — cross-referencing, citing exact sources, visualizing connections, and adapting to how you learn.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '13px 28px', borderRadius: 9, fontSize: '0.95rem', background: '#6366f1', color: '#fff', textDecoration: 'none', fontWeight: 700, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              Start for free <ChevronRight size={15} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 28px', borderRadius: 9, fontSize: '0.95rem', background: '#fff', color: '#374151', textDecoration: 'none', fontWeight: 600, border: '1.5px solid #e5e7eb' }}>
              Sign in
            </Link>
          </div>
        </motion.div>

        {/* App preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
          style={{ marginTop: '60px', maxWidth: '880px', margin: '60px auto 0', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
            {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Synthesis — Chat</span>
          </div>
          <div style={{ display: 'flex', height: 360 }}>
            <div style={{ width: 190, borderRight: '1px solid #f3f4f6', padding: '14px 10px', background: '#fafafa', flexShrink: 0 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folders</div>
              {['DBMS Notes', 'ML Research', 'Final Year Project'].map((name, i) => (
                <div key={name} style={{ padding: '6px 8px', borderRadius: 6, marginBottom: 3, fontSize: '0.8rem', fontWeight: i === 0 ? 600 : 400, background: i === 0 ? '#eef2ff' : 'transparent', color: i === 0 ? '#6366f1' : '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={12} /> {name}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
              <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '11px 14px', fontSize: '0.77rem', color: '#6366f1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Agent reasoning</div>
                {['✓ Strategy: multi-document search selected', '✓ Searching "DBMS Notes — Chapter 3.pdf"...', '✓ Cross-referencing "Normalization Paper.pdf"...', '✓ Synthesizing answer with 2 citations...'].map(s => <div key={s} style={{ opacity: 0.85 }}>{s}</div>)}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '13px', fontSize: '0.83rem', color: '#374151', lineHeight: 1.65 }}>
                <strong>Third Normal Form (3NF)</strong> eliminates transitive dependencies, ensuring every non-key attribute depends only on the primary key{' '}
                <span style={{ background: '#eef2ff', color: '#6366f1', borderRadius: 4, padding: '1px 5px', fontSize: '0.73rem', fontWeight: 700 }}>DBMS Notes, p.47</span>.
                Unlike BCNF, 3NF preserves all functional dependencies while allowing lossless decomposition{' '}
                <span style={{ background: '#eef2ff', color: '#6366f1', borderRadius: 4, padding: '1px 5px', fontSize: '0.73rem', fontWeight: 700 }}>Paper, p.12</span>.
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>Everything you need to study smarter</h2>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>A full research workflow powered by multi-step AI reasoning.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {features.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                style={{ padding: '22px', borderRadius: 12, border: '1px solid #f3f4f6', background: '#fafafa' }}
                whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)', borderColor: '#e0e7ff' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <f.icon size={19} color="#6366f1" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 5 }}>{f.title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', background: '#f9fafb' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '48px' }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {steps.map((step, i) => (
              <motion.div key={step.number} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', padding: '22px', background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>{step.number}</div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{step.title}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '940px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '48px' }}>Built for serious students</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {testimonials.map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
                style={{ padding: '22px', borderRadius: 12, border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '14px' }}>"{t.text}"</p>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{t.role}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>Ready to study smarter?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: 32 }}>Upload your first documents and experience AI-powered research in minutes.</p>
          <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '13px 30px', borderRadius: 9, fontSize: '0.95rem', background: '#fff', color: '#6366f1', textDecoration: 'none', fontWeight: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            Get started — it's free <ChevronRight size={15} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={12} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Synthesis</span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Built as a final-year capstone project</span>
      </footer>
    </div>
  )
}
