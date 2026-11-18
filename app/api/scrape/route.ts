import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const APIFY_TOKEN    = process.env.APIFY_TOKEN!
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'apify/instagram-scraper'

const DEFAULT_SEARCHES = [
  'corban consignado',
  'correspondente bancario',
  'promotora credito',
  'promotora financeira',
  'corban inss',
  'corban fgts',
  'promotora consignado',
  'correspondente credito',
  'corban credito',
  'promotora bancaria',
  'consignado inss',
  'financeira credito',
]

export async function GET() {
  return runScrape(DEFAULT_SEARCHES)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const searches: string[] = body.searches ?? DEFAULT_SEARCHES
  return runScrape(searches)
}

async function runScrape(searches: string[]) {

  const webhookUrl = 'https://instagram-perfis.vercel.app/api/scrape/webhook'

  const webhooksB64 = Buffer.from(JSON.stringify([{
    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
    requestUrl: webhookUrl,
  }])).toString('base64')

  let started = 0
  const runIds: string[] = []
  for (const search of searches) {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs?token=${APIFY_TOKEN}&webhooks=${webhooksB64}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultsType: 'details',
          search,
          searchType: 'user',
          searchLimit: 50,
          proxy: { useApifyProxy: true },
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
