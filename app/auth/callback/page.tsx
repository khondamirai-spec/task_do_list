'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasProfile } from '@/lib/profile';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code and error from URL parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          router.push(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`);
          return;
        }

        if (code) {
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            router.push(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`);
            return;
          }

          if (data.session) {
            // Check if user has a profile
            try {
              const profileExists = await hasProfile();
              if (profileExists) {
                router.push('/app');
              } else {
                router.push('/auth/setup-profile');
              }
            } catch (error) {
              // If profile check fails, redirect to setup-profile as fallback
              console.error('Error checking profile:', error);
              router.push('/auth/setup-profile');
            }
            router.refresh();
          } else {
            router.push('/auth/login?error=No session created');
          }
        } else {
          // No code parameter, check if there's already a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Check if user has a profile
            try {
              const profileExists = await hasProfile();
              if (profileExists) {
                router.push('/app');
              } else {
                router.push('/auth/setup-profile');
              }
            } catch (error) {
              // If profile check fails, redirect to setup-profile as fallback
              console.error('Error checking profile:', error);
              router.push('/auth/setup-profile');
            }
            router.refresh();
          } else {
            router.push('/auth/login?error=No authorization code received');
          }
        }
      } catch (err: any) {
        console.error('Unexpected error in auth callback:', err);
        router.push(`/auth/login?error=${encodeURIComponent(err.message || 'An unexpected error occurred')}`);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-gray-600 mb-2">Completing sign in...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
}

