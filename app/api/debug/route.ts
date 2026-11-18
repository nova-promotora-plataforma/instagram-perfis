import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const maxDuration = 30

export async function GET() {
  const [total, semFollowers, comFollowers, comTelefone, comCidade] = await Promise.all([
    prisma.igProfile.count(),
    prisma.igProfile.count({ where: { followers: null } }),
    prisma.igProfile.count({ where: { followers: { not: null } } }),
    prisma.igProfile.count({ where: { telefone: { not: null } } }),
    prisma.igProfile.count({ where: { cidade: { not: null } } }),
  ])

  // amostra dos primeiros 3 perfis sem followers para ver o que está salvo
  const amostra = await prisma.igProfile.findMany({
    where: { followers: null },
    select: { username: true, fullName: true, bio: true, cidade: true, telefone: true, scrapedAt: true },
    take: 3,
    orderBy: { scrapedAt: 'desc' },
  })

  // testa chamada ao Apify com 1 perfil
  const APIFY_TOKEN = process.env.APIFY_TOKEN
  const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'apify/instagram-scraper'
  let apifyTest: unknown = null

  if (amostra.length > 0 && APIFY_TOKEN) {
    const testUrl = `https://www.instagram.com/${amostra[0].username}/`
    const webhooksB64 = Buffer.from(JSON.stringify([{
      eventTypes: ['ACTOR.RUN.SUCCEEDED'],
      requestUrl: 'https://instagram-perfis.vercel.app/api/enrich/webhook',
    }])).toString('base64')

    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksB64}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directUrls: [testUrl], resultsType: 'details', proxy: { useApifyProxy: true } }),
      }
    )
    const data = await res.json().catch(() => ({}))
    apifyTest = { status: res.status, runId: data?.data?.id, ok: res.ok }
  }

  return NextResponse.json({
    total,
    semFollowers,
    comFollowers,
    comTelefone,
    comCidade,
    amostra,
    apifyTest,
    apifyTokenOk: !!APIFY_TOKEN,
  })
}
