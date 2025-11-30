import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { rewardTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await db.query.rewardTransactions.findMany({
      where: eq(rewardTransactions.userId, user.id),
      orderBy: [desc(rewardTransactions.createdAt)],
    });

    return NextResponse.json({
      transactions,
    });
  } catch (error) {
    logger.error('Failed to get reward history', { error });
    return NextResponse.json({ error: 'Failed to get reward history' }, { status: 500 });
  }
}
