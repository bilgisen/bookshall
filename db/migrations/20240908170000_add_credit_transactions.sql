-- Create the transaction_type enum
CREATE TYPE transaction_type AS ENUM ('earn', 'spend');

-- Create the credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  reason VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Add comments for better documentation
COMMENT ON TABLE credit_transactions IS 'Stores all credit transactions (earn/spend) for users';
COMMENT ON COLUMN credit_transactions.amount IS 'Positive integer representing the amount of credits';
COMMENT ON COLUMN credit_transactions.type IS 'Type of transaction: earn (add credits) or spend (deduct credits)';
COMMENT ON COLUMN credit_transactions.metadata IS 'Additional metadata about the transaction';

-- Add RLS (Row Level Security) policies if needed
-- Note: Adjust these based on your security requirements
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own transactions
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own transactions
-- Note: In production, you might want to restrict this to server-side only
CREATE POLICY "Users can insert their own transactions"
  ON credit_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
