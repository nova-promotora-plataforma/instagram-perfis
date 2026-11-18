import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const PAGE_SIZE = 30

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q      = (searchParams.get('q') ?? '').trim().toLowerCase()
  const status = searchParams.get('status') ?? ''
  const uf     = searchParams.get('uf') ?? ''
  const nicho  = searchParams.get('nicho') ?? ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (uf)     where.uf     = uf
  if (nicho)  where.nicho  = nicho
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [total, data] = await Promise.all([
    prisma.igProfile.count({ where }),
    prisma.igProfile.findMany({
      where,
      orderBy: { followers: 'desc' },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
  ])

  return NextResponse.json({ data, total, page, pages: Math.ceil(total / PAGE_SIZE) })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, responsavel, notas, uf, cidade, nicho, comprovante } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updated = await prisma.igProfile.update({
    where: { id: Number(id) },
    data: {
      ...(status      !== undefined && { status }),
      ...(responsavel !== undefined && { responsavel }),
      ...(notas       !== undefined && { notas }),
      ...(uf          !== undefined && { uf }),
      ...(cidade      !== undefined && { cidade }),
      ...(nicho       !== undefined && { nicho }),
      ...(comprovante !== undefined && { comprovante }),
    },
  })
  return NextResponse.json(updated)
}
