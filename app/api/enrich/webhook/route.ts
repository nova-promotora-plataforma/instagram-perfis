import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const maxDuration = 60

interface ApifyUser {
  username?:               string
  fullName?:               string
  biography?:              string
  followersCount?:         number
  followingCount?:         number
  postsCount?:             number
  verified?:               boolean
  profilePicUrl?:          string
  inputUrl?:               string
  externalUrl?:            string
  city?:                   string
  addressCity?:            string
  countryCode?:            string
  publicPhoneNumber?:      string
  publicPhoneCountryCode?: string
}

function extractWaMe(text: string | undefined): string | null {
  if (!text) return null
  const m = text.match(/(?:wa\.me|web\.whatsapp\.com\/send\?phone=)\/?(\+?[\d]{10,15})/)
  return m ? m[1] : null
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

  let updated = 0
  for (const item of items) {
    const username = item.username ?? item.inputUrl?.split('/').filter(Boolean).pop()
    if (!username) continue

    // só atualiza perfis que já existem no banco (não filtra por keyword aqui)
    const exists = await prisma.igProfile.findUnique({ where: { username }, select: { id: true } })
    if (!exists) continue

    const telefone = item.publicPhoneNumber
      ? `+${item.publicPhoneCountryCode ?? '55'}${item.publicPhoneNumber}`
      : (extractWaMe(item.externalUrl) ?? extractWaMe(item.biography))

    const cidade = item.city ?? item.addressCity ?? undefined

    try {
      await prisma.igProfile.update({
        where: { username },
        data: {
          fullName:   item.fullName          ?? undefined,
          bio:        item.biography         ?? undefined,
          followers:  item.followersCount    != null ? item.followersCount  : undefined,
          following:  item.followingCount    != null ? item.followingCount  : undefined,
          postsCount: item.postsCount        != null ? item.postsCount      : undefined,
          isVerified: item.verified          != null ? item.verified        : undefined,
          avatarUrl:  item.profilePicUrl     ?? undefined,
          cidade:     cidade                 ?? undefined,
          telefone:   telefone               ?? undefined,
        },
      })
      updated++
    } catch { /* skip */ }
  }

  return NextResponse.json({ ok: true, updated })
}
