import { CreditBalance } from '@/components/credits/CreditBalance';
import { CreditWidget } from '../_components/credit-widget';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CreditsPage() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Your Credits</h1>
        <p className="text-muted-foreground">
          View and manage your account credits
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <CreditWidget showTopUpButton={false} />
        </div>
        
        <div className="md:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
            <CreditBalance showHistory={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
