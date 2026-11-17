import { NextRequest, NextResponse } from 'next/server'

const USERS: Record<string, { password: string; name: string }> = {
  'luiz.freitas@novapromotora.com': {
    password: process.env.AUTH_PASSWORD_LUIZ ?? 'Nova@2026',
    name:     'Luiz Freitas',
  },
  'comercial@novapromotora.com': {
    password: process.env.AUTH_PASSWORD_COMERCIAL ?? 'Nova@2026',
    name:     'Comercial',
  },
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const user = USERS[email?.toLowerCase?.()]
  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, name: user.name })
  res.cookies.set('ig_session', Buffer.from(JSON.stringify({ email, name: user.name })).toString('base64'), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8,
    path:     '/',
  })
  return res
}
