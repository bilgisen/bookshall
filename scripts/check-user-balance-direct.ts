import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserBalance() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    // Check user_balances table
    const userId = 'gDGJnnBuY2AMfDksLSENhjrbzPcX0KTW';
    
    // Check user_balances table
    const balanceResult = await client.query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId]
    );
    
    console.log('User balance record:', balanceResult.rows[0] || 'No balance record found');
    
    // Check credit_transactions
    const transactionsResult = await client.query(
      'SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    console.log('\nCredit transactions:');
    console.table(transactionsResult.rows);
    
    // Check if user exists
    const userResult = await client.query(
      'SELECT id, email FROM "user" WHERE id = $1',
      [userId]
    );
    
    console.log('\nUser info:', userResult.rows[0] || 'User not found');
    
  } catch (error) {
    console.error('Error checking user balance:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUserBalance();
