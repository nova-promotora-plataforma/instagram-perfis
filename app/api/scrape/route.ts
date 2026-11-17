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

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://instagram-perfis.vercel.app'

  const webhookUrl = `${baseUrl}/api/scrape/webhook`

  let started = 0
  for (const search of searches) {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultsType: 'details',
          search,
          searchType: 'hashtag',
          searchLimit: 10,
          proxy: { useApifyProxy: true },
          webhooks: [{
            eventTypes: ['ACTOR.RUN.SUCCEEDED'],
            requestUrl: webhookUrl,
          }],
        }),
      }
    )
    if (res.ok) started++
  }

  return NextResponse.json({
    ok: true,
    started,
    message: `${started} buscas iniciadas. Os perfis aparecem em ~3 min — atualize a página.`,
  })
}
