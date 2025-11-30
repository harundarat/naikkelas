import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getReferralStats } from '@/lib/referral';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getReferralStats(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to get referral stats', { error });
    return NextResponse.json({ error: 'Failed to get referral stats' }, { status: 500 });
  }
}
