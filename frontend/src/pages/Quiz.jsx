import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store'
import { quizApi } from '@/lib/api'
import { toast } from 'sonner'
import { BookOpen, Loader2, CheckCircle2, XCircle, ChevronRight, RotateCcw, BarChart3, Sparkles, FileText, Check, X } from 'lucide-react'

const difficultyColors = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }
const difficultyBg = { easy: '#f0fdf4', medium: '#fffbeb', hard: '#fef2f2' }

export default function Quiz() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const [phase, setPhase] = useState('setup') // setup | quiz | results | review
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(10)
  const [loading, setLoading] = useState(false)
  const [attemptId, setAttemptId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [mastery, setMastery] = useState(null)
  const [history, setHistory] = useState([])
  const [nextDifficulty, setNextDifficulty] = useState(null)

  useEffect(() => {
    if (!user?.token) return
    quizApi.history(user.token, folderId).then(setHistory).catch(console.error)
  }, [user?.token, folderId])

  const startQuiz = async () => {
    if (!user?.token) return
    setLoading(true)
    try {
      const data = await quizApi.generate(user.token, folderId, numQuestions, difficulty)
      setAttemptId(data.attempt_id)
      setQuestions(data.questions)
      setUserAnswers([])
      setCurrentIndex(0)
      setScore({ correct: 0, total: 0 })
      setSelectedAnswer(null)
      setAnswered(false)
      setPhase('quiz')
      toast.success(`Quiz generated with ${data.questions.length} questions!`)
    } catch (e) {
      toast.error(e.message || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async (index) => {
    if (answered || !user?.token) return
    setSelectedAnswer(index)
    setAnswered(true)

    const q = questions[currentIndex]
    const result = await quizApi.submit(user.token, attemptId, q.id, index)
    setLastResult(result)
    setNextDifficulty(result.next_difficulty)
    setScore({ correct: result.correct_answers, total: score.total + 1 })
    setUserAnswers(prev => [...prev, { question: q, selected: index, result }])
  }

  const nextQuestion = async () => {
    if (currentIndex + 1 >= questions.length) {
      const data = await quizApi.complete(user.token, attemptId)
      setMastery(data.mastery_level)
      setPhase('results')
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setAnswered(false)
      setLastResult(null)
    }
  }

  const question = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0

  // Setup phase
  if (phase === 'setup') return (
    <div style={{ padding: '48px 40px', maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} color="#ea580c" />
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>Adaptive Quiz</h1>
      </div>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '36px' }}>AI-generated questions that adjust difficulty based on your performance.</p>

      <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '28px', marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px', color: '#111827' }}>Quiz Settings</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '10px' }}>Starting Difficulty</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${difficulty === d ? difficultyColors[d] : '#e5e7eb'}`, background: difficulty === d ? difficultyBg[d] : '#fff', cursor: 'pointer', fontWeight: difficulty === d ? 700 : 500, fontSize: '0.875rem', color: difficulty === d ? difficultyColors[d] : '#6b7280', transition: 'all 0.15s', textTransform: 'capitalize', fontFamily: 'inherit' }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '10px' }}>
            Number of Questions: <span style={{ color: '#6366f1' }}>{numQuestions}</span>
          </label>
          <input type="range" min={5} max={20} step={5} value={numQuestions} onChange={e => setNumQuestions(+e.target.value)}
            style={{ width: '100%', accentColor: '#6366f1' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
            <span>5</span><span>10</span><span>15</span><span>20</span>
          </div>
        </div>
      </div>

      <button onClick={startQuiz} disabled={loading}
        style={{ width: '100%', height: 44, borderRadius: 9, border: 'none', background: loading ? '#a5b4fc' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit' }}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Generating questions from docs...</> : <><Sparkles size={16} /> Start Quiz</>}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={14} /> Recent Attempts
          </h2>
          {history.slice(0, 3).map(attempt => (
            <div key={attempt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #f3f4f6', marginBottom: 6 }}>
              <div style={{ fontSize: '0.82rem', color: '#374151' }}>{attempt.correct_answers}/{attempt.total_questions} correct</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6366f1' }}>{Math.round(attempt.score)}%</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>mastery: {Math.round((attempt.mastery_level || 0) * 100)}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Review phase
  if (phase === 'review') return (
    <div style={{ padding: '48px 40px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>Quiz Review</h1>
        <button onClick={() => setPhase('results')} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' }}>
          Back to Summary
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {userAnswers.map((item, idx) => (
          <div key={idx} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 6 }}>Question {idx + 1} · {item.question.source_document}</div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>{item.question.question}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {item.question.options.map((opt, optIdx) => {
                const isCorrect = optIdx === item.question.correct_index
                const isSelected = optIdx === item.selected
                let bg = '#fafafa', border = '#f3f4f6'
                if (isCorrect) { bg = '#f0fdf4'; border = '#86efac' }
                else if (isSelected && !isCorrect) { bg = '#fef2f2'; border = '#fca5a5' }

                return (
                  <div key={optIdx} style={{ padding: '8px 12px', borderRadius: 7, border: `1px solid ${border}`, background: bg, fontSize: '0.83rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                    {isCorrect && <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>Correct Answer</span>}
                    {isSelected && !isCorrect && <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}>Your Answer</span>}
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f9fafb', padding: 10, borderRadius: 7 }}>
              💡 {item.question.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  // Results phase
  if (phase === 'results') return (
    <div style={{ padding: '48px 40px', maxWidth: '600px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <BookOpen size={28} color="#6366f1" />
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Quiz Complete!</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>Here's how you performed</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Score', value: `${Math.round((score.correct / score.total) * 100)}%`, color: '#6366f1' },
          { label: 'Correct', value: `${score.correct}/${score.total}`, color: '#22c55e' },
          { label: 'Mastery', value: `${Math.round((mastery || 0) * 100)}%`, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '16px', background: '#fafafa', borderRadius: 12, border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mastery bar */}
      <div style={{ background: '#f3f4f6', borderRadius: 100, height: 8, marginBottom: '28px', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${(mastery || 0) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #818cf8, #6366f1)', borderRadius: 100 }} />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setPhase('review')}
          style={{ flex: 1, height: 42, borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
          <FileText size={15} /> Review Answers
        </button>
        <button onClick={() => setPhase('setup')}
          style={{ flex: 1, height: 42, borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
          <RotateCcw size={15} /> Take Another
        </button>
      </div>
    </div>
  )

  // Quiz phase
  return (
    <div style={{ padding: '36px 40px', maxWidth: '720px' }}>
      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>Question {currentIndex + 1} of {questions.length}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: difficultyBg[question?.difficulty || 'medium'], color: difficultyColors[question?.difficulty || 'medium'] }}>
              {nextDifficulty || question?.difficulty || 'medium'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>{score.correct} ✓</span>
          </div>
        </div>
        <div style={{ background: '#f3f4f6', borderRadius: 100, height: 5, overflow: 'hidden' }}>
          <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: '#6366f1', borderRadius: 100 }} />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '28px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '10px' }}>📄 {question?.source_document}{question?.source_page ? ` · p.${question.source_page}` : ''}</p>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', lineHeight: 1.45, marginBottom: '24px' }}>{question?.question}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question?.options.map((option, i) => {
              let bg = '#f9fafb', border = '#f3f4f6', color = '#374151'
              if (answered) {
                if (i === lastResult?.correct_index) { bg = '#f0fdf4'; border = '#86efac'; color = '#16a34a' }
                else if (i === selectedAnswer && i !== lastResult?.correct_index) { bg = '#fef2f2'; border = '#fca5a5'; color = '#dc2626' }
              }
              if (selectedAnswer === i && !answered) { bg = '#eef2ff'; border = '#6366f1'; color = '#6366f1' }

              return (
                <button key={i} onClick={() => submitAnswer(i)} disabled={answered}
                  style={{ padding: '13px 16px', borderRadius: 9, border: `1.5px solid ${border}`, background: bg, color, textAlign: 'left', cursor: answered ? 'default' : 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: border, color: color === '#374151' ? '#6b7280' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                  {answered && i === lastResult?.correct_index && <CheckCircle2 size={16} color="#16a34a" style={{ marginLeft: 'auto' }} />}
                  {answered && i === selectedAnswer && i !== lastResult?.correct_index && <XCircle size={16} color="#dc2626" style={{ marginLeft: 'auto' }} />}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Explanation + Next */}
      <AnimatePresence>
        {answered && lastResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: lastResult.is_correct ? '#f0fdf4' : '#fef2f2', border: `1px solid ${lastResult.is_correct ? '#86efac' : '#fca5a5'}`, borderRadius: 10, padding: '14px 16px', marginBottom: '14px' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: lastResult.is_correct ? '#16a34a' : '#dc2626', marginBottom: '5px' }}>
                {lastResult.is_correct ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.55 }}>{lastResult.explanation}</p>
            </div>
            <button onClick={nextQuestion}
              style={{ width: '100%', height: 42, borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
              {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'} <ChevronRight size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
