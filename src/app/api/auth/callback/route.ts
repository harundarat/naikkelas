import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userCredits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processReferral, generateReferralCode } from '@/lib/referral';
import { logger } from '@/lib/logger';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session) {
      // Check if user exists in our database
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      // If user doesn't exist, create a new user record with a null name
      if (!existingUser && session.user.email) {
        await db.insert(users).values({
          id: session.user.id,
          email: session.user.email,
          // name is left null to be set during onboarding
        });

        // Give new user 3 free credits
        await db.insert(userCredits).values({
          id: `credit_${Date.now()}`,
          userId: session.user.id,
          credits: 3,
        });

        // Process referral if referral code exists in cookie
        const referralCode = cookieStore.get('referral_code')?.value;
        if (referralCode) {
          try {
            await processReferral(session.user.id, referralCode);
            logger.info('Processed referral for new user', {
              userId: session.user.id,
              referralCode,
            });
          } catch (error) {
            logger.error('Failed to process referral', {
              userId: session.user.id,
              referralCode,
              error,
            });
          }
        }

        // Generate referral code for new user
        try {
          await generateReferralCode(session.user.id);
        } catch (error) {
          logger.error('Failed to generate referral code for new user', {
            userId: session.user.id,
            error,
          });
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const response = NextResponse.redirect(siteUrl);

  // Clear the referral code cookie
  response.cookies.set('referral_code', '', {
    path: '/',
    maxAge: 0,
  });

  return response;
}
