'use client'
import { useEffect, useState, useCallback } from 'react'

const STATUS_LABELS: Record<string, string> = {
  sem_status:      'Sem status',
  lead_comercial:  'Lead do comercial',
  abordado:        'Abordado',
  em_contato:      'Em contato',
  virou_parceiro:  'Virou parceiro',
  descartado:      'Descartado',
}
const STATUS_COLORS: Record<string, string> = {
  sem_status:      '#52525b',
  lead_comercial:  '#3b82f6',
  abordado:        '#f59e0b',
  em_contato:      '#8b5cf6',
  virou_parceiro:  '#10b981',
  descartado:      '#ef4444',
}

interface Profile {
  id: number
  username: string
  fullName: string | null
  bio: string | null
  followers: number | null
  status: string
  responsavel: string | null
  nicho: string | null
  uf: string | null
  profileUrl: string | null
  avatarUrl: string | null
}

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')
  const [editing, setEditing]   = useState<Profile | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q)      params.set('q', q)
    if (status) params.set('status', status)
    const res = await fetch(`/api/perfis?${params}`)
    const data = await res.json()
    setProfiles(data.data ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
  }, [page, q, status])

  useEffect(() => { load() }, [load])

  async function runScrape() {
    setScraping(true)
    setScrapeMsg('Executando scraper...')
    const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    if (data.error) {
      setScrapeMsg(`Erro: ${data.error}`)
    } else {
      setScrapeMsg(`Concluído: ${data.inserted} novos, ${data.skipped} ignorados`)
      load()
    }
    setScraping(false)
  }

  async function saveEdit() {
    if (!editing) return
    await fetch('/api/perfis', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    setEditing(null)
    load()
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const fmt = (n: number | null) =>
    n == null ? '—' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : String(n)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { background: #020203; margin: 0; }
        input, select, textarea { font-family: Montserrat, sans-serif; }
        .table-row { transition: background 0.15s; }
        .table-row:hover { background: rgba(255,255,255,0.03) !important; }
        .btn-primary {
          background: #b21f17; color: #fff; border: none; border-radius: 0;
          padding: 10px 22px; cursor: pointer; font-family: Montserrat, sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          transition: background 0.2s;
        }
        .btn-primary:hover:not(:disabled) { background: #991a14; }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }
        .btn-ghost {
          background: transparent; color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0; padding: 10px 18px; cursor: pointer; font-family: Montserrat, sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s;
        }
        .btn-ghost:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
        .search-input {
          background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 8px 0; color: #fff; font-family: Montserrat, sans-serif; font-size: 13px;
          outline: none; width: 100%; transition: border-color 0.2s;
        }
        .search-input::placeholder { color: rgba(255,255,255,0.2); }
        .search-input:focus { border-bottom-color: #b21f17; }
        .filter-select {
          background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 8px 24px 8px 0; color: rgba(255,255,255,0.6); font-family: Montserrat, sans-serif;
          font-size: 12px; outline: none; cursor: pointer; appearance: none;
          -webkit-appearance: none; min-width: 160px;
        }
        .filter-select option { background: #0f0f10; color: #fff; }
        .modal-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px; padding: 10px 12px; color: #fff; font-family: Montserrat, sans-serif;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .modal-input:focus { border-color: #b21f17; }
        .modal-select { appearance: none; -webkit-appearance: none; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily: 'Montserrat, sans-serif', background: '#020203', minHeight: '100vh', color: '#e5e7eb' }}>

        {/* Topbar */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>NOVA</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>PROMOTORA</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Perfis Instagram
            </span>
          </div>
          <button onClick={logout} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 10 }}>
            Sair
          </button>
        </div>

        <div style={{ padding: '32px 32px 48px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <div style={{ width: 32, height: 2, background: '#b21f17', marginBottom: 16 }} />
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Potenciais Parceiros
              </h1>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                {total} perfis encontrados
              </p>
            </div>
            <button onClick={runScrape} disabled={scraping} className="btn-primary">
              {scraping ? 'Buscando...' : '+ Buscar novos perfis'}
            </button>
          </div>

          {/* Scrape message */}
          {scrapeMsg && (
            <div style={{
              borderLeft: '2px solid #b21f17', padding: '10px 16px', marginBottom: 24,
              background: 'rgba(178,31,23,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.6)',
              fontWeight: 500, letterSpacing: '0.02em',
            }}>
              {scrapeMsg}
            </div>
          )}

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 28, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
                placeholder="Buscar username ou nome..." className="search-input" />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="filter-select">
                <option value="">Todos os status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 10, pointerEvents: 'none' }}>▾</span>
            </div>
          </div>

          {/* Tabela */}
          <div style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Perfil', 'Seguidores', 'Nicho', 'Status', 'Responsável', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: '0.1em' }}>CARREGANDO...</td></tr>
                ) : profiles.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                    Nenhum perfil. Clique em &ldquo;+ Buscar novos perfis&rdquo; para começar.
                  </td></tr>
                ) : profiles.map(p => (
                  <tr key={p.id} className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p.avatarUrl
                          ? <img src={p.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, flexShrink: 0 }}>@</div>
                        }
                        <div>
                          <a href={p.profileUrl ?? `https://instagram.com/${p.username}`} target="_blank" rel="noreferrer"
                            style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>
                            @{p.username}
                          </a>
                          {p.fullName && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>{p.fullName}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>{fmt(p.followers)}</td>
                    <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{p.nicho ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: STATUS_COLORS[p.status] ?? '#52525b',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLORS[p.status] ?? '#52525b', flexShrink: 0 }} />
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{p.responsavel ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => setEditing({ ...p })}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, padding: '5px 12px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '8px 16px' }}>←</button>
              <span style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600 }}>{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost" style={{ padding: '8px 16px' }}>→</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.08)', width: 460, padding: 32 }}>
            <div style={{ width: 24, height: 2, background: '#b21f17', marginBottom: 20 }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#fff' }}>@{editing.username}</h2>
            <p style={{ margin: '0 0 28px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Atualizar informações do perfil</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Status', key: 'status', type: 'select' },
                { label: 'Responsável', key: 'responsavel', type: 'text' },
                { label: 'Nicho', key: 'nicho', type: 'text' },
                { label: 'UF', key: 'uf', type: 'text' },
                { label: 'Notas', key: 'notas', type: 'textarea' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={(editing as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setEditing(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                      className="modal-input modal-select">
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea value={(editing as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setEditing(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                      rows={3} className="modal-input" style={{ resize: 'vertical' }} />
                  ) : (
                    <input value={(editing as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setEditing(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                      className="modal-input" />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setEditing(null)} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={saveEdit} className="btn-primary" style={{ flex: 1 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
