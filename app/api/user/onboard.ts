import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST() {
  try {
    // Kullanıcı oturumunu al
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.session?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Artık free plan veya subscription ekleme yok, sadece onboarding kontrolü
    return NextResponse.json({ onboarded: false });
  } catch (error) {
    return NextResponse.json({ error: 'Onboarding failed', message: String(error) }, { status: 500 });
  }
}
