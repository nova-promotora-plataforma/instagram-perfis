import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const maxDuration = 60

const APIFY_TOKEN    = process.env.APIFY_TOKEN!
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'apify/instagram-scraper'

export async function POST(req: NextRequest) {
  // busca perfis sem followers ainda
  const profiles = await prisma.igProfile.findMany({
    where: { followers: null },
    select: { username: true },
    take: 50,
  })

  if (profiles.length === 0) return NextResponse.json({ ok: true, message: 'Nenhum perfil para enriquecer.' })

  const directUrls = profiles.map(p => `https://www.instagram.com/${p.username}/`)

  const webhookUrl = 'https://instagram-perfis.vercel.app/api/scrape/webhook'
  const webhooksB64 = Buffer.from(JSON.stringify([{
    eventTypes: ['ACTOR.RUN.SUCCEEDED'],
    requestUrl: webhookUrl,
  }])).toString('base64')

  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksB64}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls,
        resultsType: 'details',
        proxy: { useApifyProxy: true },
      }),
    }
  )

  if (!res.ok) return NextResponse.json({ ok: false, error: 'Apify error' }, { status: 500 })

  return NextResponse.json({ ok: true, enriching: profiles.length, message: `Enriquecendo ${profiles.length} perfis...` })
}
