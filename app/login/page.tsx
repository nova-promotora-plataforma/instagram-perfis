'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form     = new FormData(e.currentTarget)
    const email    = form.get('email') as string
    const password = form.get('password') as string
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'E-mail ou senha incorretos.'); return }
      router.push('/')
    } catch {
      setError('Falha de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020203; }
        .login-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          padding: 10px 0;
          color: #fff;
          font-family: Montserrat, sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus { border-bottom-color: #b21f17; }
        .login-btn {
          width: 100%;
          background: #b21f17;
          color: #fff;
          border: none;
          padding: 14px;
          font-family: Montserrat, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }
        .login-btn:hover:not(:disabled) { background: #991a14; }
        .login-btn:disabled { opacity: 0.6; cursor: default; }
      `}</style>

      <main style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: 'Montserrat, sans-serif',
        background: '#020203',
      }}>
        {/* Lado esquerdo — branding */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Linha decorativa vermelha */}
          <div style={{ width: 48, height: 3, background: '#b21f17', marginBottom: 32 }} />

          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>NOVA</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              PROMOTORA
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 280 }}>
            Sistema interno de prospecção de parceiros via Instagram.
          </p>

          {/* Círculo decorativo */}
          <div style={{
            position: 'absolute', bottom: -120, left: -80,
            width: 360, height: 360,
            borderRadius: '50%',
            border: '1px solid rgba(178,31,23,0.15)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: -40,
            width: 240, height: 240,
            borderRadius: '50%',
            border: '1px solid rgba(178,31,23,0.1)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Lado direito — formulário */}
        <div style={{
          width: 400,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#b21f17', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
            Acesso restrito
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.01em' }}>
            Entrar na plataforma
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 40 }}>
            Use suas credenciais corporativas
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                E-mail
              </label>
              <input name="email" type="email" required autoComplete="email" placeholder="seu@novapromotora.com" className="login-input" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPwd ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••" className="login-input" style={{ paddingRight: 32 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 4 }}>
                  {showPwd ? '◎' : '○'}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#f87171', marginTop: -12 }}>{error}</p>
            )}

            <button type="submit" disabled={loading} className="login-btn" style={{ marginTop: 8 }}>
              {loading ? 'Autenticando…' : 'Entrar'}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>
            © {new Date().getFullYear()} Nova Promotora · Uso interno
          </p>
        </div>
      </main>
    </>
  )
}
