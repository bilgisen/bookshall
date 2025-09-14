'use client';

import { useTransactions } from '@/hooks/useTransactions';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface TransactionListProps {
  pageSize?: number;
  maxItems?: number;
}

export function TransactionList({ pageSize = 10, maxItems }: TransactionListProps) {
  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useTransactions(pageSize);

  const transactions = data?.pages.flatMap(page => page.transactions) || [];
  const visibleTransactions = maxItems ? transactions.slice(0, maxItems) : transactions;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Failed to load transactions. Please try again.</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {visibleTransactions.map((tx) => (
          <div 
            key={tx.id} 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {tx.type === 'earn' ? (
                  <ArrowUpCircle className="h-5 w-5" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {tx.reason || (tx.type === 'earn' ? 'Credits earned' : 'Credits spent')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className={`font-medium ${
              tx.type === 'earn' ? 'text-green-600' : 'text-rose-600'
            }`}>
              {tx.type === 'earn' ? '+' : '-'}{tx.amount}
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && !maxItems && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
