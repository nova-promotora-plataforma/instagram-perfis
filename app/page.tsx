'use client'
import { useEffect, useState, useCallback } from 'react'

const STATUS_LABELS: Record<string, string> = {
  sem_status:      'Sem status',
  abordado:        'Abordado',
  em_contato:      'Em contato',
  virou_parceiro:  'Virou parceiro',
  ja_parceiro:     'Já é parceiro',
  descartado:      'Descartado',
}
const STATUS_COLORS: Record<string, string> = {
  sem_status:      '#52525b',
  lead_comercial:  '#3b82f6',
  abordado:        '#f59e0b',
  em_contato:      '#8b5cf6',
  virou_parceiro:  '#10b981',
  ja_parceiro:     '#06b6d4',
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
  cidade: string | null
  telefone: string | null
  profileUrl: string | null
  avatarUrl: string | null
  comprovante: string | null
  codigoParceiro: string | null
}

export default function Home() {
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [pages, setPages]         = useState(1)
  const [q, setQ]                 = useState('')
  const [status, setStatus]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [scraping, setScraping]   = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState('')
  const [editing, setEditing]     = useState<Profile | null>(null)
  const [polling, setPolling]     = useState(false)
  const [showHelp, setShowHelp]   = useState(false)
  const [sortKey, setSortKey]     = useState<string>('')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [dark, setDark]           = useState(true)
  const [filterOpen, setFilterOpen]       = useState(false)
  const [modalOpen, setModalOpen]         = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // persiste preferência de tema
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved) setDark(saved === 'dark')
    } catch {}
  }, [])
  function toggleTheme() {
    setDark(d => {
      try { localStorage.setItem('theme', !d ? 'dark' : 'light') } catch {}
      return !d
    })
  }

  // tokens de cor baseados no tema
  const t = dark ? {
    bg:          '#020203',
    bgSub:       '#0a0a0b',
    bgCard:      'rgba(255,255,255,0.015)',
    border:      'rgba(255,255,255,0.06)',
    borderSub:   'rgba(255,255,255,0.05)',
    text:        '#e5e7eb',
    textStrong:  '#ffffff',
    textMuted:   'rgba(255,255,255,0.4)',
    textFaint:   'rgba(255,255,255,0.2)',
    inputBg:     'rgba(255,255,255,0.04)',
    inputBorder: 'rgba(255,255,255,0.08)',
    rowHover:    'rgba(255,255,255,0.03)',
    optionBg:    '#0f0f10',
    optionColor: '#ffffff',
    modalOverlay:'rgba(0,0,0,0.85)',
    themeIcon:   '☀️',
    themeLabel:  'Claro',
  } : {
    bg:          '#f5f5f7',
    bgSub:       '#ffffff',
    bgCard:      'rgba(0,0,0,0.02)',
    border:      'rgba(0,0,0,0.08)',
    borderSub:   'rgba(0,0,0,0.05)',
    text:        '#1a1a1a',
    textStrong:  '#000000',
    textMuted:   'rgba(0,0,0,0.5)',
    textFaint:   'rgba(0,0,0,0.3)',
    inputBg:     'rgba(0,0,0,0.04)',
    inputBorder: 'rgba(0,0,0,0.12)',
    rowHover:    'rgba(0,0,0,0.02)',
    optionBg:    '#ffffff',
    optionColor: '#000000',
    modalOverlay:'rgba(0,0,0,0.6)',
    themeIcon:   '🌙',
    themeLabel:  'Escuro',
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q)      params.set('q', q)
    if (status) params.set('status', status)
    const res = await fetch(`/api/perfis?${params}`, { cache: 'no-store' })
    const data = await res.json()
    setProfiles(data.data ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
    return data.total ?? 0
  }, [page, q, status])

  useEffect(() => { load() }, [load])

  async function runScrape() {
    setScraping(true)
    setScrapeMsg('Iniciando buscas...')
    const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const data = await res.json()
    if (data.error) { setScrapeMsg(`Erro: ${data.error}`); setScraping(false); return }
    setScrapeMsg('Buscando perfis... atualizando automaticamente.')
    setScraping(false)
    setPolling(true)
    let prev = total; let stable = 0
    const interval = setInterval(async () => {
      const current = await load()
      if (current === prev) { stable++ } else { stable = 0; prev = current }
      if (stable >= 3) { clearInterval(interval); setPolling(false); setScrapeMsg(`Busca concluída — ${current} perfis no total.`) }
    }, 15000)
  }

  async function handleUpload(file: File) {
    if (!editing) return
    setUploading(true)
    setUploadProgress(0)
    const timer = setInterval(() => setUploadProgress(p => Math.min(p + 2, 90)), 300)
    const form = new FormData()
    form.append('file', file)
    form.append('username', editing.username)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      clearInterval(timer)
      if (data.url) {
        setUploadProgress(100)
        setEditing(prev => prev ? { ...prev, comprovante: data.url } : null)
        setUploadPreview(data.url)
      } else {
        setUploadProgress(0)
        alert('Erro ao enviar: ' + (data.error ?? 'tente novamente'))
      }
    } catch {
      clearInterval(timer)
      setUploadProgress(0)
      alert('Erro de conexão ao enviar o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    await fetch('/api/perfis', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    setEditing(null)
    setUploadPreview(null)
    load()
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...profiles].sort((a, b) => {
    if (!sortKey) return 0
    const av = (a as unknown as Record<string, unknown>)[sortKey]
    const bv = (b as unknown as Record<string, unknown>)[sortKey]
    if (av == null && bv == null) return 0
    if (av == null) return 1; if (bv == null) return -1
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base' })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const fmt = (n: number | null) =>
    n == null ? '—' : n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}k` : String(n)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { background: ${t.bg}; margin: 0; transition: background 0.2s; }
        input, select, textarea { font-family: Montserrat, sans-serif; }
        .table-row { transition: background 0.15s; }
        .table-row:hover { background: ${t.rowHover} !important; }
        .btn-primary {
          background: #b21f17; color: #fff; border: none; border-radius: 0;
          padding: 10px 22px; cursor: pointer; font-family: Montserrat, sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          transition: background 0.2s;
        }
        .btn-primary:hover:not(:disabled) { background: #991a14; }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }
        .btn-ghost {
          background: transparent; color: ${t.textMuted}; border: 1px solid ${t.border};
          border-radius: 0; padding: 10px 18px; cursor: pointer; font-family: Montserrat, sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s;
        }
        .btn-ghost:hover { color: ${t.textStrong}; border-color: ${t.inputBorder}; }
        .search-input {
          background: transparent; border: none; border-bottom: 1px solid ${t.border};
          padding: 8px 0; color: ${t.text}; font-family: Montserrat, sans-serif; font-size: 13px;
          outline: none; width: 100%; transition: border-color 0.2s;
        }
        .search-input::placeholder { color: ${t.textFaint}; }
        .search-input:focus { border-bottom-color: #b21f17; }
        .filter-select {
          background: transparent; border: none; border-bottom: 1px solid ${t.border};
          padding: 8px 24px 8px 0; color: ${t.textMuted}; font-family: Montserrat, sans-serif;
          font-size: 12px; outline: none; cursor: pointer; appearance: none;
          -webkit-appearance: none; min-width: 160px;
        }
        .filter-select option { background: ${t.optionBg}; color: ${t.optionColor}; }
        .modal-input {
          width: 100%; background: ${t.inputBg}; border: 1px solid ${t.inputBorder};
          border-radius: 2px; padding: 10px 12px; color: ${t.text}; font-family: Montserrat, sans-serif;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .modal-input:focus { border-color: #b21f17; }
        .modal-select { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .modal-select option { background: ${t.optionBg}; color: ${t.optionColor}; }
        .edit-btn {
          background: transparent; border: 1px solid ${t.inputBorder}; border-radius: 1px;
          padding: 5px 12px; color: ${t.textMuted}; cursor: pointer;
          font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.15s;
        }
        .edit-btn:hover { color: ${t.textStrong}; border-color: ${t.border}; }
      `}</style>

      <div style={{ fontFamily: 'Montserrat, sans-serif', background: t.bg, minHeight: '100vh', color: t.text, transition: 'background 0.2s, color 0.2s' }}>

        {/* Topbar */}
        <div style={{ borderBottom: `1px solid ${t.border}`, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: t.textStrong, letterSpacing: '-0.01em' }}>NOVA</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, letterSpacing: '0.25em', textTransform: 'uppercase' }}>PROMOTORA</span>
            </div>
            <div style={{ width: 1, height: 16, background: t.border }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Perfis Instagram</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleTheme} title={`Mudar para tema ${t.themeLabel}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t.themeLabel}</span>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{dark ? '☀️' : '🌙'}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                width: 44, height: 24, borderRadius: 12,
                background: dark ? 'rgba(255,255,255,0.15)' : '#b21f17',
                border: `1.5px solid ${dark ? 'rgba(255,255,255,0.25)' : '#991a14'}`,
                padding: '2px 3px',
                transition: 'background 0.25s, border-color 0.25s',
              }}>
                <span style={{
                  display: 'block', width: 18, height: 18, borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  transform: dark ? 'translateX(0)' : 'translateX(20px)',
                  transition: 'transform 0.25s',
                }} />
              </span>
            </button>
            <button onClick={logout} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 10 }}>Sair</button>
          </div>
        </div>

        <div style={{ padding: '32px 32px 48px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <div style={{ width: 32, height: 2, background: '#b21f17', marginBottom: 16 }} />
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: t.textStrong, letterSpacing: '-0.02em', lineHeight: 1 }}>Potenciais Parceiros</h1>
              <p style={{ margin: '8px 0 0', color: t.textMuted, fontSize: 13 }}>{total} perfis encontrados</p>
            </div>
            <button onClick={runScrape} disabled={scraping} className="btn-primary">
              {scraping ? 'Buscando...' : '+ Buscar novos perfis'}
            </button>
          </div>

          {/* Painel de ajuda */}
          <div style={{ marginBottom: 24, border: `1px solid ${t.border}`, background: t.bgCard }}>
            <button onClick={() => setShowHelp(v => !v)}
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: t.textMuted, fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 12 }}>?</span> Como usar este sistema</span>
              <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: showHelp ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {showHelp && (
              <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${t.borderSub}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 16 }}>
                {[
                  { icon: '🔍', titulo: 'Buscar novos perfis', passos: ['Clique em "+ Buscar novos perfis"', 'Aguarde ~5 minutos (a página atualiza sozinha)', 'Novos corbans e promotoras aparecem automaticamente', 'O sistema também busca todo dia às 7h sem precisar de ninguém'] },
                  { icon: '✏️', titulo: 'Atualizar um perfil', passos: ['Clique em "Editar" na linha do perfil', 'Preencha status, responsável, produto principal, cidade, UF ou notas', 'No status "Abordado" anexe o print da abordagem como comprovante', 'Ao virar parceiro, registre o código do parceiro para identificação interna', 'Clique em "Salvar"'] },
                  { icon: '🎯', titulo: 'Status dos perfis', passos: ['Sem status → ainda não analisado', 'Abordado → já foi contatado (anexe comprovante)', 'Em contato → negociação em andamento', 'Virou parceiro → fechou parceria (registre o código)', 'Já é parceiro → já era parceiro antes do sistema', 'Descartado → não tem fit'] },
                  { icon: '🔎', titulo: 'Filtrar e pesquisar', passos: ['Use a barra de busca para filtrar por @username ou nome', 'Use o seletor de status para ver apenas um grupo', 'Clique no @username para abrir o perfil no Instagram', 'Clique nos cabeçalhos da tabela para ordenar'] },
                ].map(item => (
                  <div key={item.titulo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.textStrong, letterSpacing: '0.05em' }}>{item.titulo}</span>
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 16 }}>
                      {item.passos.map((p, i) => (
                        <li key={i} style={{ fontSize: 12, color: t.textMuted, marginBottom: 5, lineHeight: 1.5 }}>{p}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scrape message */}
          {scrapeMsg && (
            <div style={{ borderLeft: '2px solid #b21f17', padding: '10px 16px', marginBottom: 24, background: 'rgba(178,31,23,0.06)', fontSize: 12, color: t.textMuted, fontWeight: 500, letterSpacing: '0.02em' }}>
              {scrapeMsg}
            </div>
          )}

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 28, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Buscar username ou nome..." className="search-input" />
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setFilterOpen(v => !v)}
                style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${t.border}`, padding: '8px 24px 8px 0', color: t.textMuted, fontFamily: 'Montserrat, sans-serif', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, outline: 'none' }}>
                {status ? (
                  <><span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0 }} />{STATUS_LABELS[status]}</>
                ) : 'Todos os status'}
                <span style={{ marginLeft: 'auto', color: t.textFaint, fontSize: 10 }}>▾</span>
              </button>
              {filterOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, background: t.bgSub, border: `1px solid ${t.border}`, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginTop: 4 }}>
                  {[{ key: '', label: 'Todos os status', color: '' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v, color: STATUS_COLORS[k] }))].map(opt => (
                    <button key={opt.key} onClick={() => { setStatus(opt.key); setPage(1); setFilterOpen(false) }}
                      style={{ width: '100%', background: status === opt.key ? t.bgCard : 'transparent', border: 'none', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Montserrat, sans-serif', fontSize: 12, color: t.text, textAlign: 'left' }}>
                      {opt.color
                        ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                        : <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1px solid ${t.border}`, flexShrink: 0 }} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div style={{ border: `1px solid ${t.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}`, background: t.bgCard }}>
                  {[
                    { label: 'Perfil',      key: 'username'    },
                    { label: 'Seguidores',  key: 'followers'   },
                    { label: 'Cidade',      key: 'cidade'      },
                    { label: 'Telefone',    key: 'telefone'    },
                    { label: 'Produto',     key: 'nicho'       },
                    { label: 'Status',      key: 'status'      },
                    { label: 'Responsável', key: 'responsavel' },
                    { label: '',            key: ''            },
                  ].map(({ label, key }) => (
                    <th key={key || 'actions'} onClick={key ? () => toggleSort(key) : undefined}
                      style={{ padding: '12px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: sortKey === key ? t.text : t.textFaint, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {label}
                      {key && <span style={{ marginLeft: 4, opacity: sortKey === key ? 1 : 0.4 }}>{sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: t.textFaint, fontSize: 12, letterSpacing: '0.1em' }}>CARREGANDO...</td></tr>
                ) : profiles.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: t.textFaint, fontSize: 12 }}>Nenhum perfil. Clique em &ldquo;+ Buscar novos perfis&rdquo; para começar.</td></tr>
                ) : sorted.map(p => (
                  <tr key={p.id} className="table-row" style={{ borderBottom: `1px solid ${t.borderSub}` }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p.avatarUrl
                          ? <img src={p.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textFaint, fontSize: 12, flexShrink: 0 }}>@</div>
                        }
                        <div>
                          <a href={p.profileUrl ?? `https://instagram.com/${p.username}`} target="_blank" rel="noreferrer"
                            style={{ color: t.textStrong, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>
                            @{p.username}
                          </a>
                          {p.fullName && <div style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>{p.fullName}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: t.textMuted, fontSize: 13, fontWeight: 600 }}>{fmt(p.followers)}</td>
                    <td style={{ padding: '14px 16px', color: t.textMuted, fontSize: 12 }}>{p.cidade ?? '—'}</td>
                    <td style={{ padding: '14px 16px', color: t.textMuted, fontSize: 12 }}>{p.telefone ?? '—'}</td>
                    <td style={{ padding: '14px 16px', color: t.textMuted, fontSize: 12 }}>{p.nicho ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: STATUS_COLORS[p.status] ?? '#52525b' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLORS[p.status] ?? '#52525b', flexShrink: 0 }} />
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: t.textMuted, fontSize: 12 }}>{p.responsavel ?? '—'}</td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {p.comprovante && (
                        <a href={p.comprovante} target="_blank" rel="noreferrer" title="Ver comprovante"
                          style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8, color: '#f59e0b', fontSize: 14, textDecoration: 'none' }}>📎</a>
                      )}
                      <button onClick={() => { setEditing({ ...p }); setUploadPreview(p.comprovante ?? null) }} className="edit-btn">Editar</button>
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
              <span style={{ padding: '8px 16px', color: t.textMuted, fontSize: 12, fontWeight: 600 }}>{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost" style={{ padding: '8px 16px' }}>→</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: t.modalOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div style={{ background: t.bgSub, border: `1px solid ${t.border}`, width: 460, padding: 32 }}>
            <div style={{ width: 24, height: 2, background: '#b21f17', marginBottom: 20 }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: t.textStrong }}>@{editing.username}</h2>
            <p style={{ margin: '0 0 28px', fontSize: 12, color: t.textMuted }}>Atualizar informações do perfil</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Status',            key: 'status',      type: 'select'   },
                { label: 'Responsável',       key: 'responsavel', type: 'text'     },
                { label: 'Produto principal', key: 'nicho',       type: 'text', placeholder: 'Ex: CLT, FGTS, INSS' },
                { label: 'Cidade',            key: 'cidade',      type: 'text'     },
                { label: 'UF',               key: 'uf',          type: 'text'     },
                { label: 'Notas',             key: 'notas',       type: 'textarea' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: t.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setModalOpen(v => !v)}
                        style={{ width: '100%', background: t.inputBg, border: `1px solid ${modalOpen ? '#b21f17' : t.inputBorder}`, borderRadius: 2, padding: '10px 12px', color: t.text, fontFamily: 'Montserrat, sans-serif', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, outline: 'none', textAlign: 'left' }}>
                        {(() => { const k = (editing as unknown as Record<string,string>)[f.key] ?? ''; return (<><span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[k] ?? '#52525b', flexShrink: 0 }} />{STATUS_LABELS[k] ?? k}</>); })()}
                        <span style={{ marginLeft: 'auto', color: t.textFaint, fontSize: 10 }}>▾</span>
                      </button>
                      {modalOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: t.bgSub, border: `1px solid ${t.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', marginTop: 2 }}>
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <button key={k} onClick={() => { setEditing(prev => prev ? { ...prev, [f.key]: k } : null); setModalOpen(false) }}
                              style={{ width: '100%', background: (editing as unknown as Record<string,string>)[f.key] === k ? t.bgCard : 'transparent', border: 'none', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Montserrat, sans-serif', fontSize: 13, color: t.text, textAlign: 'left' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[k] ?? '#52525b', flexShrink: 0 }} />
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : f.type === 'textarea' ? (
                    <textarea value={(editing as unknown as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setEditing(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                      rows={3} className="modal-input" style={{ resize: 'vertical' }} />
                  ) : (
                    <input value={(editing as unknown as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setEditing(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                      placeholder={(f as { placeholder?: string }).placeholder ?? ''}
                      className="modal-input" />
                  )}
                </div>
              ))}
            </div>
            {/* Código do parceiro — aparece só quando virou_parceiro ou ja_parceiro */}
            {(editing.status === 'virou_parceiro' || editing.status === 'ja_parceiro') && (
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Código do parceiro
                </label>
                <input
                  value={(editing as unknown as Record<string, string>).codigoParceiro ?? ''}
                  onChange={e => setEditing(prev => prev ? { ...prev, codigoParceiro: e.target.value } : null)}
                  placeholder="Ex: NP-2024-001"
                  className="modal-input"
                />
              </div>
            )}

            {/* Comprovante — aparece sempre, destaque quando abordado */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: editing.status === 'abordado' ? '#f59e0b' : t.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                Comprovante de abordagem {editing.status === 'abordado' && '⚠'}
              </label>
              {(uploadPreview ?? editing.comprovante) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <a href={uploadPreview ?? editing.comprovante ?? ''} target="_blank" rel="noreferrer">
                    <img src={uploadPreview ?? editing.comprovante ?? ''} alt="comprovante"
                      style={{ height: 64, width: 'auto', borderRadius: 2, border: `1px solid ${t.border}`, objectFit: 'cover', cursor: 'pointer' }} />
                  </a>
                  <div>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>✓ Print enviado</div>
                    <label style={{ fontSize: 10, color: t.textMuted, cursor: 'pointer', textDecoration: 'underline' }}>
                      Trocar
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
                    </label>
                  </div>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1px dashed ${editing.status === 'abordado' ? '#f59e0b' : t.inputBorder}`, borderRadius: 2, padding: '20px 16px', cursor: 'pointer', color: t.textMuted, fontSize: 12, transition: 'border-color 0.2s' }}>
                  {uploading ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11 }}>⏳ Enviando... {uploadProgress}%</span>
                      <div style={{ width: '100%', height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#f59e0b', borderRadius: 2, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  ) : '📎 Clique para enviar o print da abordagem'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} disabled={uploading} />
                </label>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => { setEditing(null); setUploadPreview(null) }} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={saveEdit} className="btn-primary" style={{ flex: 1 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
