'use client';

import { CreditBalance } from '@/components/credits/CreditBalance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Plus } from 'lucide-react';
import Link from 'next/link';

type CreditWidgetProps = {
  showTopUpButton?: boolean;
};

export function CreditWidget({ showTopUpButton = true }: CreditWidgetProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Your Credits
          </CardTitle>
          {showTopUpButton && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/credits">
                <Plus className="h-4 w-4 mr-1" />
                Top Up
              </Link>
            </Button>
          )}
        </div>
        <CardDescription>
          Manage your account credits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CreditBalance showHistory={false} />
        </div>
      </CardContent>
      {showTopUpButton && (
        <CardFooter className="border-t pt-4">
          <Button variant="link" className="p-0 h-auto" asChild>
            <Link href="/dashboard/credits/history" className="text-sm">
              View full transaction history
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
