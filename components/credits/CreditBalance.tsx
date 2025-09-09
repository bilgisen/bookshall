'use client';

import { useCredits } from '@/lib/hooks/useCredits';
import { format } from 'date-fns';
import { CreditCard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

type CreditBalanceProps = {
  userId: string;
  showHistory?: boolean;
};

export function CreditBalance({ userId, showHistory = true }: CreditBalanceProps) {
  const { 
    balance, 
    transactions, 
    isLoading, 
    error,
    refetchBalance 
  } = useCredits(userId);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p>Error loading credit balance. Please try again.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => refetchBalance()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Your Balance</CardDescription>
          <CardTitle className="text-3xl font-bold">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                {balance.toLocaleString()} credits
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <p>Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent credit transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : transactions?.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx: { id: string; type: 'earn' | 'spend'; amount: number; reason: string; createdAt: string }) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">
                        {tx.reason.split('_').map((word: string) => 
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {tx.type === 'earn' ? (
                        <>
                          <ArrowUpCircle className="mr-1 h-4 w-4 text-green-500" />
                          <span className="font-mono text-green-600">+{tx.amount}</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownCircle className="mr-1 h-4 w-4 text-red-500" />
                          <span className="font-mono text-red-600">-{tx.amount}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type CreditBadgeProps = {
  amount: number;
  className?: string;
};

export function CreditBadge({ amount, className = '' }: CreditBadgeProps) {
  return (
    <Badge 
      variant={amount >= 0 ? 'default' : 'destructive'}
      className={`inline-flex items-center gap-1 font-mono ${className}`}
    >
      {amount >= 0 ? (
        <>
          <ArrowUpCircle className="h-3 w-3" />
          {amount.toLocaleString()}
        </>
      ) : (
        <>
          <ArrowDownCircle className="h-3 w-3" />
          {Math.abs(amount).toLocaleString()}
        </>
      )}
    </Badge>
  );
}
