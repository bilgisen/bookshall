'use client';

import { Button } from '../ui/button';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSpendCredits } from '@/hooks/useSpendCredits';
import { useBalance } from '@/hooks/useBalance';
import { CreditTransactionResponse } from '@/types/credits';

type CreditActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (result: CreditTransactionResponse) => void;
  onError?: (error: Error) => void;
  showCredits?: boolean;
  confirmMessage?: string;
  disabled?: boolean;
};

export function CreditActionButton({
  amount,
  reason,
  metadata = {},
  onSuccess,
  onError,
  showCredits = true,
  confirmMessage,
  children,
  disabled = false,
  ...props
}: CreditActionButtonProps) {
  const { data: balanceData } = useBalance();
  const { mutate: spendCredits, isPending: isLoading } = useSpendCredits();

  const handleSuccess = (data: CreditTransactionResponse) => {
    toast.success('Successfully spent credits');
    if (onSuccess) onSuccess(data);
  };

  const handleError = (error: Error) => {
    console.error('Failed to spend credits:', error);
    toast.error(error.message || 'Failed to spend credits');
    if (onError) onError(error);
  };

  const handleClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    
    spendCredits(
      { amount, reason, metadata },
      {
        onSuccess: handleSuccess,
        onError: handleError,
      }
    );
  };

  const canAfford = balanceData?.balance !== undefined && balanceData.balance >= amount;
  const isDisabled = disabled || isLoading;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleClick}
          disabled={isDisabled}
          variant={!canAfford ? 'outline' : 'default'}
          {...props}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            children
          )}
        </Button>
        {showCredits && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{amount} credits</span>
          </div>
        )}
      </div>
      {!canAfford && balanceData && (
        <p className="text-xs text-red-500">
          Insufficient balance. You need {amount - balanceData.balance} more credits.
        </p>
      )}
    </div>
  );
}
