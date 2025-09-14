'use client';

import { useState } from 'react';
import { useSpendCredits } from '@/hooks/useSpendCredits';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SpendCreditsButtonProps {
  maxAmount?: number;
  onSuccess?: () => void;
  children?: React.ReactNode;
  defaultAmount?: number;
  defaultReason?: string;
}

export function SpendCreditsButton({
  maxAmount,
  onSuccess,
  children = 'Spend Credits',
  defaultAmount = 0,
  defaultReason = '',
}: SpendCreditsButtonProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [reason, setReason] = useState(defaultReason);
  const [isOpen, setIsOpen] = useState(false);
  
  const { mutate: spendCredits, isPending } = useSpendCredits();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount <= 0) {
      toast.error('Error spending credits', {
        description: 'Please enter a positive number of credits to spend.',
      });
      return;
    }

    if (maxAmount !== undefined && amount > maxAmount) {
      toast.error('Insufficient balance', {
        description: `You can spend up to ${maxAmount} credits.`,
      });
      return;
    }

    spendCredits(
      { amount, reason },
      {
        onSuccess: () => {
          toast.success('Success', {
            description: `Successfully spent ${amount} credits.`,
          });
          setAmount(0);
          setReason('');
          setIsOpen(false);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error('Error', {
            description: error instanceof Error ? error.message : 'Failed to spend credits.',
          });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Spend Credits</Button>}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Spend Credits</DialogTitle>
            <DialogDescription>
              Enter the amount of credits you want to spend and a reason.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                max={maxAmount}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount"
                required
              />
              {maxAmount !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Available: {maxAmount} credits
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What are you spending credits on?"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || amount <= 0}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Spend Credits'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
