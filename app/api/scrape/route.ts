import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const APIFY_TOKEN    = process.env.APIFY_TOKEN!
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'apify/instagram-scraper'

const DEFAULT_SEARCHES = [
  'promotora credito',
  'correspondente bancario',
  'corban consignado',
]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const searches: string[] = body.searches ?? DEFAULT_SEARCHES

  const webhookUrl = 'https://instagram-perfis.vercel.app/api/scrape/webhook'

  let started = 0
  const runIds: string[] = []
  for (const search of searches) {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultsType: 'details',
          search,
          searchType: 'user',
          searchLimit: 10,
          proxy: { useApifyProxy: true },
          webhooks: [{
            eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
            requestUrl: webhookUrl,
          }],
        }),
      }
    )
    if (res.ok) {
      started++
      const data = await res.json().catch(() => ({}))
      if (data?.data?.id) runIds.push(data.data.id)
    }
  }

  return NextResponse.json({
    ok: true,
    started,
    runIds,
    message: `${started} buscas iniciadas. Os perfis aparecem em ~5 min — atualize a página.`,
  })
}
