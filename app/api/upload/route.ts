import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const username = form.get('username') as string | null

  if (!file || !username) return NextResponse.json({ error: 'file e username obrigatórios' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const blob = await put(`comprovantes/${username}-${Date.now()}.${ext}`, file, { access: 'public' })

  return NextResponse.json({ url: blob.url })
}
