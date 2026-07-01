import { eq } from 'drizzle-orm'
import { coupon, referralCode, referralInvite } from '@/db/schema'
import { db } from '@/lib/db'
import { grantCouponToUser } from '@/lib/coupon'

function generateReferralCode(userId: string) {
  return userId.slice(-6).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export async function getOrCreateReferralCode(userId: string) {
  const existing = await db.query.referralCode.findFirst({
    where: eq(referralCode.userId, userId),
  })
  if (existing) {
    return existing.code
  }

  const [row] = await db
    .insert(referralCode)
    .values({
      userId,
      code: generateReferralCode(userId),
    })
    .returning()

  return row.code
}

export async function recordReferralOnSignup(inviteeId: string, refCode: string) {
  const ref = await db.query.referralCode.findFirst({
    where: eq(referralCode.code, refCode.toUpperCase()),
  })
  if (!ref || ref.userId === inviteeId) {
    return null
  }

  const existing = await db.query.referralInvite.findFirst({
    where: eq(referralInvite.inviteeId, inviteeId),
  })
  if (existing) {
    return existing
  }

  const [invite] = await db
    .insert(referralInvite)
    .values({
      inviterId: ref.userId,
      inviteeId,
      status: 'PENDING',
    })
    .returning()

  return invite
}

export async function rewardReferralOnFirstOrder(inviteeId: string) {
  const invite = await db.query.referralInvite.findFirst({
    where: eq(referralInvite.inviteeId, inviteeId),
  })

  if (!invite || invite.status !== 'PENDING') {
    return
  }

  const inviterCoupon = await db.query.coupon.findFirst({
    where: eq(coupon.name, '邀请有礼-邀请人'),
  })
  const inviteeCoupon = await db.query.coupon.findFirst({
    where: eq(coupon.name, '邀请有礼-新用户'),
  })

  if (inviterCoupon) {
    await grantCouponToUser(invite.inviterId, inviterCoupon.id)
  }
  if (inviteeCoupon) {
    await grantCouponToUser(inviteeId, inviteeCoupon.id)
  }

  await db
    .update(referralInvite)
    .set({ status: 'REWARDED', rewardedAt: new Date() })
    .where(eq(referralInvite.id, invite.id))
}

export async function getReferralStats(userId: string) {
  const code = await getOrCreateReferralCode(userId)
  const invites = await db.query.referralInvite.findMany({
    where: eq(referralInvite.inviterId, userId),
  })

  return {
    code,
    totalInvites: invites.length,
    rewardedCount: invites.filter((i) => i.status === 'REWARDED').length,
  }
}
