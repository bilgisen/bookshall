-- Create transaction_type enum
CREATE TYPE transaction_type AS ENUM ('earn', 'spend');

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_balances table
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- Create a trigger function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_credit_transactions_updated_at
BEFORE UPDATE ON credit_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON user_balances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to update user balance when a transaction is inserted
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'earn' THEN
            INSERT INTO user_balances (user_id, balance, updated_at)
            VALUES (NEW.user_id, NEW.amount, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                balance = user_balances.balance + NEW.amount,
                updated_at = NOW();
        ELSIF NEW.type = 'spend' THEN
            INSERT INTO user_balances (user_id, balance, updated_at)
            VALUES (NEW.user_id, -NEW.amount, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                balance = user_balances.balance - NEW.amount,
                updated_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the transaction insert
CREATE TRIGGER trigger_update_user_balance
AFTER INSERT ON credit_transactions
FOR EACH ROW EXECUTE FUNCTION update_user_balance();

-- Create a function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT COALESCE(balance, 0) INTO v_balance
    FROM user_balances
    WHERE user_id = p_user_id;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;
