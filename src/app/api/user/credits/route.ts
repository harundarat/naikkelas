import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { userCredits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let credit = await db.query.userCredits.findFirst({
      where: eq(userCredits.userId, user.id),
    });

    // Create default credits if not exists
    if (!credit) {
      const [newCredit] = await db.insert(userCredits).values({
        id: `credit_${Date.now()}`,
        userId: user.id,
        credits: 3000, // 3000 tokens for new user trial
      }).returning();
      credit = newCredit;
      logger.info('Created default credits for user', { userId: user.id, credits: 3000 });
    }

    return NextResponse.json({
      credits: credit.credits,
      userId: user.id,
    });
  } catch (error) {
    logger.error('Failed to get user credits', { error });
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 });
  }
}
