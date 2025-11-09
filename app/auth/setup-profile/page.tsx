'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { upsertProfile, hasProfile } from '@/lib/profile';
import { AvatarPicker } from '@/components/ui/avatar-picker';

export default function SetupProfilePage() {
  const [fullName, setFullName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [step, setStep] = useState<'name' | 'avatar'>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and if they already have a profile
    const checkAuthAndProfile = async () => {
      const session = await getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Check if profile already exists
      const profileExists = await hasProfile();
      if (profileExists) {
        // User already has a profile, redirect to app
        router.push('/app');
        return;
      }

      setCheckingAuth(false);
    };
    checkAuthAndProfile();
  }, [router]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (fullName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    // Move to avatar selection step
    setStep('avatar');
  };

  const handleAvatarSelect = (selectedAvatarId: number) => {
    setAvatarId(selectedAvatarId);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await upsertProfile(fullName.trim(), avatarId);
      // Redirect to app after successful profile creation
      router.push('/app');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        {step === 'name' ? (
          <>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Welcome! Let's get started
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Please tell us your name to personalize your experience
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleNameSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Choose Your Avatar
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Pick an avatar that represents you
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-8">
              <AvatarPicker 
                fullName={fullName} 
                onAvatarSelect={handleAvatarSelect}
              />
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setStep('name')}
                disabled={loading}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

