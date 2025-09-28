'use client';

import { useCredits } from '@/hooks/use-credits';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CreditWidget() {
  const { 
    balance, 
    transactions, 
    isLoadingBalance, 
    isLoadingTransactions, 
    refresh 
  } = useCredits(3);

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="rounded-lg border bg-card/20 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Your Credits</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isLoadingBalance || isLoadingTransactions}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingBalance || isLoadingTransactions ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>
      
      <div className="mt-4">
        {isLoadingBalance ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold">{balance} <span className="text-sm font-normal text-muted-foreground">credits</span></div>
            <div className="text-sm text-muted-foreground">Available balance</div>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-medium">Recent Transactions</h4>
        {isLoadingTransactions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {tx.reason || 'Credit transaction'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className={`text-sm font-medium ${tx.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
            No transactions yet
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/credits">View All</a>
        </Button>
        <Button variant="default" size="sm" asChild>
          <a href="/pricing">Add Credit</a>
        </Button>
      </div>
    </div>
  );
}
