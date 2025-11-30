'use client';

import { createClientSupabaseClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import Image from 'next/image';

export default function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSupabaseClient();

  // Capture referral code from URL and store in cookie
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      // Store in cookie for 24 hours
      document.cookie = `referral_code=${refCode}; path=/; max-age=86400; SameSite=Lax`;
    }
  }, [searchParams]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') {
        router.push('/');
      }
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />;
  }

  return session ? (
    <button 
      onClick={handleSignOut} 
      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
    >
      Logout ({session.user.email})
    </button>
  ) : (
    <button 
      onClick={handleSignIn} 
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-200 group floating-hover"
    >
      <Image src="/google-logo.svg" alt="Google Logo" width={18} height={18} />
      <span className="text-sm font-medium text-gray-700">Sign in with Google</span>
    </button>
  );
}
