import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Brain, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

const strengthColors = ['#e5e7eb', '#ef4444', '#f59e0b', '#22c55e']
const strengthLabels = ['', 'Too short', 'Good', 'Strong']

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false); setTimeout(() => navigate('/app'), 2500) }
  }

  const inputStyle = { width: '100%', height: '42px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', fontFamily: 'inherit' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f3ff 0%, #fff 60%)', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', padding: '40px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={18} color="#fff" /></div>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', letterSpacing: '-0.02em' }}>Synthesis</span>
          </Link>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '22px', marginBottom: '5px', color: '#111827' }}>Create your account</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Start studying smarter today</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={48} color="#22c55e" />
            <h3 style={{ fontWeight: 700, color: '#111827' }}>Account created!</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Check your email to confirm, then you'll be redirected automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '12px' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required
                  style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: '7px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3].map(l => <div key={l} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= l ? strengthColors[strength] : '#e5e7eb', transition: 'background 0.2s' }} />)}
                  </div>
                  <span style={{ fontSize: '0.73rem', color: strengthColors[strength] }}>{strengthLabels[strength]}</span>
                </div>
              )}
            </div>

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', fontSize: '0.83rem', color: '#dc2626' }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ height: '42px', borderRadius: 8, border: 'none', background: loading ? '#a5b4fc' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.92rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit' }}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              Create account
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.85rem', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
