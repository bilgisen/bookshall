import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function fixZeroBalances() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Find users with zero or negative balance
    const result = await client.query(
      `UPDATE user_balances 
       SET balance = 1000, 
           updated_at = NOW() 
       WHERE balance <= 0 
       RETURNING user_id, balance`
    );
    
    await client.query('COMMIT');
    
    console.log(`Updated ${result.rowCount} user balances to 1000 credits`);
    console.log('Updated users:', result.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing zero balances:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixZeroBalances().catch(console.error);
