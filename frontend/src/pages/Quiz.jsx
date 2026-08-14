import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store'
import { quizApi } from '@/lib/api'
import { toast } from 'sonner'
import { BookOpen, Loader2, CheckCircle2, XCircle, ChevronRight, RotateCcw, BarChart3, Sparkles, FileText } from 'lucide-react'

const difficultyColors = { easy: 'text-emerald-600 border-emerald-300 bg-emerald-50', medium: 'text-amber-600 border-amber-300 bg-amber-50', hard: 'text-rose-600 border-rose-300 bg-rose-50' }

export default function Quiz() {
  const { folderId } = useParams()
  const { user } = useAuthStore()
  const [phase, setPhase] = useState('setup')
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
      toast.success(`Generated ${data.questions.length} adaptive quiz questions!`)
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

  if (phase === 'setup') return (
    <div className="p-10 max-w-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Adaptive Quiz Generator</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">AI generates questions directly from folder documents and scales difficulty automatically.</p>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-7 mb-6 shadow-2xs">
        <h2 className="font-bold text-sm text-slate-900 mb-5">Configure Quiz</h2>

        <div className="mb-6">
          <label className="text-xs font-semibold text-slate-700 block mb-2.5">Initial Difficulty</label>
          <div className="grid grid-cols-3 gap-2.5">
            {['easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                  difficulty === d
                    ? difficultyColors[d] + ' shadow-2xs'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Questions Count: <span className="text-indigo-600 font-bold">{numQuestions}</span>
          </label>
          <input
            type="range"
            min={5}
            max={20}
            step={5}
            value={numQuestions}
            onChange={e => setNumQuestions(+e.target.value)}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>5</span><span>10</span><span>15</span><span>20</span>
          </div>
        </div>
      </div>

      <button
        onClick={startQuiz}
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Quiz from Documents...</> : <><Sparkles className="w-4 h-4" /> Start Adaptive Quiz</>}
      </button>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Recent Attempt History
          </h2>
          <div className="space-y-2">
            {history.slice(0, 3).map(attempt => (
              <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                <span className="text-slate-700 font-medium">{attempt.correct_answers}/{attempt.total_questions} correct</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-indigo-600">{Math.round(attempt.score)}%</span>
                  <span className="text-slate-400 text-[11px]">mastery: {Math.round((attempt.mastery_level || 0) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (phase === 'review') return (
    <div className="p-10 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-slate-900">Quiz Review & Breakdown</h1>
        <button onClick={() => setPhase('results')} className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white">
          Back to Summary
        </button>
      </div>

      <div className="space-y-4">
        {userAnswers.map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <p className="text-[11px] text-slate-400 mb-1">Question {idx + 1} · Source: {item.question.source_document}</p>
            <h3 className="text-sm font-bold text-slate-900 mb-3">{item.question.question}</h3>
            <div className="space-y-1.5 mb-3">
              {item.question.options.map((opt, optIdx) => {
                const isCorrect = optIdx === item.question.correct_index
                const isSelected = optIdx === item.selected
                let bg = 'bg-slate-50 border-slate-200'
                if (isCorrect) bg = 'bg-emerald-50 border-emerald-300 text-emerald-800'
                else if (isSelected && !isCorrect) bg = 'bg-rose-50 border-rose-300 text-rose-800'

                return (
                  <div key={optIdx} className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-medium ${bg}`}>
                    <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                    {isCorrect && <span className="text-[10px] font-bold text-emerald-700 uppercase">Correct</span>}
                    {isSelected && !isCorrect && <span className="text-[10px] font-bold text-rose-700 uppercase">Your Choice</span>}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
              💡 {item.question.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  if (phase === 'results') return (
    <div className="p-10 max-w-md mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-5">
        <BookOpen className="w-8 h-8 text-indigo-600" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Quiz Completed!</h1>
      <p className="text-xs text-slate-500 mb-8">Performance breakdown and updated mastery level</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Score', value: `${Math.round((score.correct / score.total) * 100)}%`, color: 'text-indigo-600' },
          { label: 'Correct', value: `${score.correct}/${score.total}`, color: 'text-emerald-600' },
          { label: 'Mastery', value: `${Math.round((mastery || 0) * 100)}%`, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 rounded-full h-2.5 mb-8 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(mastery || 0) * 100}%` }}
          transition={{ duration: 1 }}
          className="h-full bg-indigo-600 rounded-full"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setPhase('review')}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5"
        >
          <FileText className="w-4 h-4" /> Review
        </button>
        <button
          onClick={() => setPhase('setup')}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-10 max-w-2xl">
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-slate-500 font-medium">Question {currentIndex + 1} of {questions.length}</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200">
              {nextDifficulty || question?.difficulty || 'medium'}
            </span>
            <span className="text-emerald-600 font-bold">{score.correct} ✓</span>
          </div>
        </div>
        <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} className="h-full bg-indigo-600 rounded-full" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-7 mb-4 shadow-2xs"
        >
          <p className="text-[11px] text-slate-400 font-medium mb-2">📄 {question?.source_document}{question?.source_page ? ` · p.${question.source_page}` : ''}</p>
          <h2 className="text-base font-bold text-slate-900 leading-snug mb-6">{question?.question}</h2>

          <div className="space-y-2.5">
            {question?.options.map((option, i) => {
              let style = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-300'
              if (answered) {
                if (i === lastResult?.correct_index) style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold'
                else if (i === selectedAnswer && i !== lastResult?.correct_index) style = 'bg-rose-50 border-rose-300 text-rose-900'
              }
              if (selectedAnswer === i && !answered) style = 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold'

              return (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={answered}
                  className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-3 ${style}`}
                >
                  <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {answered && i === lastResult?.correct_index && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {answered && i === selectedAnswer && i !== lastResult?.correct_index && <XCircle className="w-4 h-4 text-rose-600" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {answered && lastResult && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`p-4 rounded-xl border text-xs mb-4 ${lastResult.is_correct ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <p className="font-bold mb-1">{lastResult.is_correct ? '✓ Correct Answer' : '✗ Incorrect'}</p>
              <p className="leading-relaxed">{lastResult.explanation}</p>
            </div>
            <button
              onClick={nextQuestion}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              {currentIndex + 1 >= questions.length ? 'Finish & View Summary' : 'Next Question'} <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
