import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrCreateReferralCode } from '@/lib/referral';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const code = await getOrCreateReferralCode(user.id);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const referralLink = `${siteUrl}?ref=${code}`;

    return NextResponse.json({
      code,
      referralLink,
    });
  } catch (error) {
    logger.error('Failed to get referral code', { error });
    return NextResponse.json({ error: 'Failed to get referral code' }, { status: 500 });
  }
}
