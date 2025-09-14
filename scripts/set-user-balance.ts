import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function setUserBalance() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    const userId = 'gDGJnnBuY2AMfDksLSENhjrbzPcX0KTW';
    const balance = 1000;
    
    await client.query('BEGIN');
    
    // Try to update existing balance
    const updateResult = await client.query(
      'UPDATE user_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [balance, userId]
    );
    
    // If no rows were updated, insert a new record
    if (updateResult.rowCount === 0) {
      console.log('No existing balance record found, inserting new one');
      await client.query(
        'INSERT INTO user_balances (user_id, balance, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [userId, balance]
      );
      console.log('Created new balance record with 1000 credits');
    } else {
      console.log('Updated existing balance to 1000 credits');
    }
    
    await client.query('COMMIT');
    
    // Verify the balance was set
    const result = await client.query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId]
    );
    
    console.log('Final balance:', result.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting user balance:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setUserBalance();
