import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, FileText, Network, Zap, ChevronRight, BookOpen, Search, MessageSquare, Star, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

const features = [
  { icon: Brain, title: 'Agentic Multi-Step Reasoning', description: 'Multi-pass AI loop (plan → retrieve → evaluate → synthesize) rather than naive single-shot vector RAG.' },
  { icon: Search, title: 'Cross-Document Semantic Search', description: 'Ask queries spanning 10+ documents. The agent intelligently decides target files and query variants.' },
  { icon: FileText, title: 'Exact Page Citations', description: 'Every answer references explicit document names and page numbers parsed directly from source files.' },
  { icon: Network, title: 'Interactive Concept Maps', description: 'Visual D3.js force-directed knowledge graph mapping concept co-occurrences across uploaded files.' },
  { icon: BookOpen, title: 'Adaptive Quiz Engine', description: 'AI-generated multiple-choice quizzes that scale difficulty in real time based on user accuracy.' },
  { icon: Zap, title: 'Live Reasoning Stream', description: 'Real-time Server-Sent Events (SSE) streaming intermediate thought steps directly to the interface.' },
]

const steps = [
  { number: '01', title: 'Upload & Index Documents', desc: 'Drag and drop PDFs, DOCX, or TXT files into organized course folders.' },
  { number: '02', title: 'Local Semantic Embedding', desc: 'Documents are chunked with page-number metadata and indexed in ChromaDB.' },
  { number: '03', title: 'Reason & Synthesize', desc: 'The agent plans retrieval paths and cross-references source materials.' },
  { number: '04', title: 'Master & Test', desc: 'Interact with concept graphs, take adaptive quizzes, and track mastery.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-700">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">Synthesis</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="px-4.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm shadow-indigo-200 transition-all hover:shadow-indigo-300"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 text-center bg-gradient-to-b from-indigo-50/60 via-white to-white overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/70 border border-indigo-200/80 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 fill-indigo-600" />
            AI-Powered Multi-Document Agent
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Your research & notes, <br className="hidden sm:block" />
            <span className="text-indigo-600">intelligently connected</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload PDFs, lecture slides, and papers. Synthesis reasons across all of them — cross-referencing sources, providing page citations, and generating adaptive quizzes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Start Researching Free <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-base transition-colors flex items-center justify-center"
            >
              Sign In to Account
            </Link>
          </div>
        </motion.div>

        {/* Hero Product Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-14 max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-200/60 overflow-hidden text-left"
        >
          {/* Browser Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="text-xs text-slate-400 font-medium tracking-wide">Synthesis App UI Demo</div>
            <div className="w-12" />
          </div>

          <div className="flex h-96">
            {/* Sidebar Mock */}
            <div className="w-52 border-r border-slate-200/80 bg-slate-50/50 p-3 flex-shrink-0 hidden sm:block">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</div>
              {['DBMS Notes', 'ML Research', 'Final Year Project'].map((name, i) => (
                <div
                  key={name}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium mb-1 ${
                    i === 0 ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{name}</span>
                </div>
              ))}
            </div>

            {/* Chat Area Mock */}
            <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden bg-white">
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 space-y-1">
                <div className="font-bold text-indigo-700 mb-1 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Agent Multi-Step Reasoning
                </div>
                <div className="text-indigo-600 opacity-90">✓ Strategy: multi_doc cross-reference selected</div>
                <div className="text-indigo-600 opacity-90">✓ Searching DBMS_Notes_Ch3.pdf...</div>
                <div className="text-indigo-600 opacity-90">✓ Evaluated context completeness (Confidence: 0.94)</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-800 leading-relaxed">
                <strong>Third Normal Form (3NF)</strong> eliminates transitive functional dependencies, ensuring every non-key attribute depends directly on the candidate key{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold text-[11px]">
                  DBMS Notes, p.47
                </span>
                . Unlike BCNF, 3NF preserves functional dependencies while allowing lossless join decomposition{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold text-[11px]">
                  Normalization Paper, p.12
                </span>
                .
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Engineered for Serious Research & Study
            </h2>
            <p className="text-slate-600 text-base max-w-xl mx-auto">
              Every feature designed for capstone performance, citation accuracy, and deep comprehension.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-center mb-14">
            How Synthesis Operates
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-5 p-5 bg-slate-50/70 rounded-xl border border-slate-200/80"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 px-6 bg-indigo-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Experience AI-Powered Multi-Document Research
          </h2>
          <p className="text-indigo-100 text-base mb-8">
            Create your account in seconds and upload your course materials.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-base shadow-lg transition-all"
          >
            Get Started Free <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-slate-200 text-center text-xs text-slate-500">
        Synthesis — Capstone Engineering Project
      </footer>
    </div>
  )
}
