'use client';

import { useRouter } from 'next/navigation';

export async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      throw new Error('Not authenticated');
    }
    const session = await response.json();
    return { user: session?.user };
  } catch (error) {
    return { user: null };
  }
}

export async function requireAuth() {
  const { user } = await checkAuth();
  if (!user) {
    // This will be handled by the client component
    throw new Error('Authentication required');
  }
  return { user };
}

export function useRequireAuth(redirectPath = '/sign-in') {
  const router = useRouter();
  
  return async () => {
    try {
      const { user } = await checkAuth();
      if (!user) {
        router.push(redirectPath);
      }
      return { user };
    } catch (error) {
      router.push(redirectPath);
      return { user: null };
    }
  };
}
