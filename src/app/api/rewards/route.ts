import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRewardBalance } from '@/lib/referral';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balance = await getRewardBalance(user.id);

    return NextResponse.json({
      balance,
      userId: user.id,
    });
  } catch (error) {
    logger.error('Failed to get reward balance', { error });
    return NextResponse.json({ error: 'Failed to get reward balance' }, { status: 500 });
  }
}
