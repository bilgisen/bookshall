-- Add user_balances table
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- Backfill from existing transactions
INSERT INTO user_balances(user_id, balance, created_at, updated_at)
SELECT 
  user_id,
  COALESCE(SUM(CASE 
    WHEN type = 'earn'::transaction_type THEN amount 
    WHEN type = 'spend'::transaction_type THEN -amount 
    ELSE 0 
  END), 0) AS balance,
  now(),
  now()
FROM credit_transactions
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;

-- Ensure all users have a balance record
INSERT INTO user_balances(user_id, balance, created_at, updated_at)
SELECT 
  id, 
  0, 
  now(), 
  now()
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM user_balances ub WHERE ub.user_id = u.id
);
