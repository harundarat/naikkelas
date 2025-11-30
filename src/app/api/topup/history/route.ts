import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { topupTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await db.query.topupTransactions.findMany({
      where: eq(topupTransactions.userId, user.id),
      orderBy: [desc(topupTransactions.createdAt)],
      limit: 50,
    });

    return NextResponse.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        credits: tx.credits,
        status: tx.status,
        createdAt: tx.createdAt,
        paidAt: tx.paidAt,
      })),
    });

  } catch (error) {
    logger.error('Failed to get transaction history', { error });
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}
