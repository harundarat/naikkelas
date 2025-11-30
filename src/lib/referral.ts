import { db } from '@/db';
import { referralCodes, referrals, userRewards, rewardTransactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Reward amounts in IDR
export const REWARD_LEVEL_1 = 75000; // Rp.75,000
export const REWARD_LEVEL_2 = 25000; // Rp.25,000

/**
 * Generate a random string for IDs and codes
 */
function generateId(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique referral code for a user
 */
export async function generateReferralCode(userId: string): Promise<string> {
  const code = `REF_${generateId(8)}`;

  await db.insert(referralCodes).values({
    id: `refcode_${Date.now()}_${generateId(6)}`,
    userId,
    code,
  });

  logger.info('Generated referral code', { userId, code });
  return code;
}

/**
 * Get or create referral code for a user
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.userId, userId),
  });

  if (existing) {
    return existing.code;
  }

  return generateReferralCode(userId);
}

/**
 * Find the user who owns a referral code
 */
export async function findReferrerByCode(code: string): Promise<string | null> {
  const referralCode = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.code, code),
  });

  return referralCode?.userId ?? null;
}

/**
 * Find the Level-1 referrer of a user (for determining Level-2 referrer)
 */
export async function findLevel1Referrer(userId: string): Promise<string | null> {
  const referral = await db.query.referrals.findFirst({
    where: eq(referrals.referredUserId, userId),
  });

  return referral?.referrerLevel1Id ?? null;
}

/**
 * Credit reward to a user
 */
export async function creditReward(
  userId: string,
  amount: number,
  type: 'REFERRAL_LEVEL1' | 'REFERRAL_LEVEL2' | 'REDEMPTION',
  referralId?: string,
  description?: string
): Promise<void> {
  // Get or create user rewards record
  let userReward = await db.query.userRewards.findFirst({
    where: eq(userRewards.userId, userId),
  });

  if (!userReward) {
    const [newReward] = await db.insert(userRewards).values({
      id: `reward_${Date.now()}_${generateId(6)}`,
      userId,
      balance: 0,
    }).returning();
    userReward = newReward;
  }

  // Update balance and create transaction
  await db.update(userRewards)
    .set({
      balance: sql`${userRewards.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(userRewards.userId, userId));

  await db.insert(rewardTransactions).values({
    id: `rewardtx_${Date.now()}_${generateId(6)}`,
    userId,
    amount,
    type,
    referralId: referralId ?? null,
    description,
  });

  logger.info('Credited reward', { userId, amount, type, referralId });
}

/**
 * Process referral when a new user registers
 * Returns the referral ID if created, null otherwise
 */
export async function processReferral(
  newUserId: string,
  referralCode: string
): Promise<string | null> {
  // Find the Level-1 referrer (owner of the referral code)
  const level1ReferrerId = await findReferrerByCode(referralCode);

  if (!level1ReferrerId) {
    logger.warn('Invalid referral code', { referralCode, newUserId });
    return null;
  }

  // Prevent self-referral
  if (level1ReferrerId === newUserId) {
    logger.warn('Self-referral attempted', { newUserId, referralCode });
    return null;
  }

  // Check if user was already referred
  const existingReferral = await db.query.referrals.findFirst({
    where: eq(referrals.referredUserId, newUserId),
  });

  if (existingReferral) {
    logger.warn('User already has a referrer', { newUserId });
    return null;
  }

  // Find the Level-2 referrer (Level-1 referrer's referrer)
  const level2ReferrerId = await findLevel1Referrer(level1ReferrerId);

  // Create the referral record
  const referralId = `referral_${Date.now()}_${generateId(6)}`;
  await db.insert(referrals).values({
    id: referralId,
    referredUserId: newUserId,
    referrerLevel1Id: level1ReferrerId,
    referrerLevel2Id: level2ReferrerId,
  });

  logger.info('Created referral', {
    referralId,
    newUserId,
    level1ReferrerId,
    level2ReferrerId
  });

  // Credit Level-1 referrer
  await creditReward(
    level1ReferrerId,
    REWARD_LEVEL_1,
    'REFERRAL_LEVEL1',
    referralId,
    `Referral bonus for inviting new user`
  );

  // Credit Level-2 referrer if exists
  if (level2ReferrerId) {
    await creditReward(
      level2ReferrerId,
      REWARD_LEVEL_2,
      'REFERRAL_LEVEL2',
      referralId,
      `Level 2 referral bonus`
    );
  }

  return referralId;
}

/**
 * Get reward balance for a user
 */
export async function getRewardBalance(userId: string): Promise<number> {
  const userReward = await db.query.userRewards.findFirst({
    where: eq(userRewards.userId, userId),
  });

  return userReward?.balance ?? 0;
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number;
  level1Count: number;
  level2Count: number;
  totalRewardsEarned: number;
}> {
  // Count Level-1 referrals (direct referrals)
  const level1Referrals = await db.query.referrals.findMany({
    where: eq(referrals.referrerLevel1Id, userId),
  });

  // Count Level-2 referrals (indirect referrals)
  const level2Referrals = await db.query.referrals.findMany({
    where: eq(referrals.referrerLevel2Id, userId),
  });

  // Calculate total rewards earned
  const transactions = await db.query.rewardTransactions.findMany({
    where: eq(rewardTransactions.userId, userId),
  });

  const totalRewardsEarned = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalReferrals: level1Referrals.length + level2Referrals.length,
    level1Count: level1Referrals.length,
    level2Count: level2Referrals.length,
    totalRewardsEarned,
  };
}
