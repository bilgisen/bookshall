import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkSpecificUserBalance() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    const userId = 'gDGJnnBuY2AMfDksLSENhjrbzPcX0KTW';
    
    // Check user_balances table
    const balanceResult = await client.query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId]
    );
    
    console.log('User balance record:', balanceResult.rows[0] || 'No balance record found');
    
    // Check user info
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

checkSpecificUserBalance();
