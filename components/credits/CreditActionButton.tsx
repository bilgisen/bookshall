'use client';

import { Button } from '../ui/button';
import type { ButtonHTMLAttributes } from 'react';
import { CreditAction } from '@/lib/config/credits';
import { useCredits } from '@/lib/hooks/useCredits';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CreditBadge } from './CreditBalance';

type CreditActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  userId: string;
  action: CreditAction;
  amount?: number;
  metadata?: Record<string, unknown>;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
  showCredits?: boolean;
  confirmMessage?: string;
};

export function CreditActionButton({
  userId,
  action,
  amount,
  metadata = {},
  onSuccess,
  onError,
  showCredits = true,
  confirmMessage,
  children,
  ...props
}: CreditActionButtonProps) {
  const { performCreditAction, balance, isLoading } = useCredits(userId);
  
  const handleClick = async () => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      const result = await performCreditAction(action, amount, metadata);
      toast.success('Action completed successfully');
      if (onSuccess) onSuccess(result);
    } catch (error) {
      console.error('Credit action failed:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      if (onError) onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  };
  
  // Determine if the button should be disabled
  const isDisabled = props.disabled || isLoading;
  
  // Get the credit cost/earn amount
  const creditAmount = amount !== undefined ? amount : 
    (action === 'PUBLISH_BOOK' ? -100 : 
     action === 'PUBLISH_CHAPTER' ? -10 : 
     action === 'USE_AI_ASSISTANT' ? -5 : 0);
  
  // Check if user can afford the action (for spending actions)
  const canAfford = creditAmount >= 0 || (balance !== undefined && balance >= Math.abs(creditAmount));
  
  return (
    <div className="flex flex-col gap-2">
      <Button 
        {...props} 
        onClick={handleClick}
        disabled={isDisabled || !canAfford}
        className="relative"
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
      
      {showCredits && creditAmount !== 0 && (
        <div className="text-center text-sm text-muted-foreground">
          {creditAmount > 0 ? (
            <span>Earns <CreditBadge amount={creditAmount} /></span>
          ) : (
            <span>Costs <CreditBadge amount={creditAmount} /></span>
          )}
          {creditAmount < 0 && balance !== undefined && (
            <span className="block text-xs mt-1">
              {canAfford 
                ? `You have ${balance.toLocaleString()} credits available`
                : `You need ${Math.abs(creditAmount - balance)} more credits`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
