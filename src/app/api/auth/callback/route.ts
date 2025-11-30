import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userCredits } from '@/db/schema';
import { eq } from 'drizzle-orm';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
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
      if (!existingUser) {
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
      }
    }
  }

  // URL to redirect to after sign in process completes
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  return NextResponse.redirect(siteUrl);
}
