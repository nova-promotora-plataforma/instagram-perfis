import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const APIFY_TOKEN    = process.env.APIFY_TOKEN!
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? 'apify/instagram-scraper'

// Termos de busca padrão para o Brasil (cred/promotora/corban/consignado)
const DEFAULT_SEARCHES = [
  'promotora de crédito',
  'correspondente bancário',
  'corban crédito consignado',
  'crédito consignado parceiro',
]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const searches: string[] = body.searches ?? DEFAULT_SEARCHES
  const resultsPerSearch   = Math.min(body.resultsPerSearch ?? 20, 50)

  // Chama Apify run-sync (espera resultado)
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultsType: 'details',
        search: searches[0],
        searchType: 'user',
        searchLimit: resultsPerSearch,
        proxy: { useApifyProxy: true },
      }),
    }
  )

  if (!runRes.ok) {
    const err = await runRes.text()
    return NextResponse.json({ error: `Apify error: ${err}` }, { status: 500 })
  }

  const items: ApifyUser[] = await runRes.json()

  let inserted = 0
  let skipped  = 0

  for (const item of items) {
    const username = item.username ?? item.inputUrl?.split('/').filter(Boolean).pop()
    if (!username) continue

    try {
      await prisma.igProfile.upsert({
        where: { username },
        create: {
          username,
          fullName:   item.fullName ?? null,
          bio:        item.biography ?? null,
          followers:  item.followersCount ?? null,
          following:  item.followingCount ?? null,
          postsCount: item.postsCount ?? null,
          isVerified: item.verified ?? false,
          profileUrl: `https://instagram.com/${username}`,
          avatarUrl:  item.profilePicUrl ?? null,
        },
        update: {
          fullName:   item.fullName ?? undefined,
          bio:        item.biography ?? undefined,
          followers:  item.followersCount ?? undefined,
          following:  item.followingCount ?? undefined,
          postsCount: item.postsCount ?? undefined,
          isVerified: item.verified ?? undefined,
          avatarUrl:  item.profilePicUrl ?? undefined,
        },
      })
      inserted++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ total: items.length, inserted, skipped })
}

interface ApifyUser {
  username?:       string
  fullName?:       string
  biography?:      string
  followersCount?: number
  followingCount?: number
  postsCount?:     number
  verified?:       boolean
  profilePicUrl?:  string
  inputUrl?:       string
}
