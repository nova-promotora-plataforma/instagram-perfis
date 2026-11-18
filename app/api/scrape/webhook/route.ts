import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const maxDuration = 60

interface ApifyUser {
  username?:            string
  fullName?:            string
  biography?:           string
  followersCount?:      number
  followingCount?:      number
  postsCount?:          number
  verified?:            boolean
  profilePicUrl?:       string
  inputUrl?:            string
  city?:                string
  country?:             string
  countryCode?:         string
  businessCategoryName?: string
  isBusinessAccount?:   boolean
  publicPhoneNumber?:   string
  publicPhoneCountryCode?: string
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null)
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 })

  const datasetId = payload?.resource?.defaultDatasetId
  if (!datasetId) return NextResponse.json({ ok: false, error: 'no datasetId' }, { status: 400 })

  const APIFY_TOKEN = process.env.APIFY_TOKEN!
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
  )
  if (!itemsRes.ok) return NextResponse.json({ ok: false }, { status: 500 })

  const items: ApifyUser[] = await itemsRes.json()

  let inserted = 0
  for (const item of items) {
    const username = item.username ?? item.inputUrl?.split('/').filter(Boolean).pop()
    if (!username) continue
    try {
      // só salva se for do Brasil (ou sem país definido)
      if (item.countryCode && item.countryCode !== 'BR') continue

      // filtra apenas perfis relevantes ao nicho (username + nome + bio)
      const KEYWORDS = [
        'corban', 'promotora', 'correspondente', 'consignado', 'financeira',
        'credito', 'cred', 'bancario', 'emprestimo', 'fgts', 'inss',
        'loas', 'trabalhador', 'consig', 'previd', 'beneficio', 'aposentad',
      ]
      const haystack = `${username} ${item.fullName ?? ''} ${item.biography ?? ''}`.toLowerCase()
      if (!KEYWORDS.some(k => haystack.includes(k))) continue

      // extrai telefone: campo oficial > wa.me na bio > web.whatsapp na bio
      function extractPhone(bio: string | undefined): string | null {
        if (!bio) return null
        const m = bio.match(/(?:wa\.me|web\.whatsapp\.com\/send\?phone=)\/?(\+?[\d]{10,15})/)
        return m ? m[1] : null
      }
      const telefone = item.publicPhoneNumber
        ? `+${item.publicPhoneCountryCode ?? '55'}${item.publicPhoneNumber}`
        : extractPhone(item.biography)

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
          cidade:     item.city ?? null,
          telefone,
        },
        update: {
          fullName:   item.fullName ?? undefined,
          bio:        item.biography ?? undefined,
          followers:  item.followersCount ?? undefined,
          following:  item.followingCount ?? undefined,
          postsCount: item.postsCount ?? undefined,
          isVerified: item.verified ?? undefined,
          avatarUrl:  item.profilePicUrl ?? undefined,
          cidade:     item.city ?? undefined,
          telefone:   telefone ?? undefined,
        },
      })
      inserted++
    } catch { /* skip duplicates */ }
  }

  // dispara enriquecimento em background se salvou perfis novos
  if (inserted > 0) {
    const baseUrl = 'https://instagram-perfis.vercel.app'
    fetch(`${baseUrl}/api/enrich`, { method: 'POST' }).catch(() => {})
  }

  return NextResponse.json({ ok: true, inserted })
}
