const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkBalances() {
  const client = await pool.connect();
  
  try {
    // Check user_balances table
    const balancesRes = await client.query('SELECT * FROM user_balances');
    console.log('User balances:');
    console.table(balancesRes.rows);
    
    // Check users table
    const usersRes = await client.query('SELECT id, email FROM "user"');
    console.log('\nUsers:');
    console.table(usersRes.rows);
    
    // Check credit_transactions table
    const transactionsRes = await client.query('SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 5');
    console.log('\nRecent transactions:');
    console.table(transactionsRes.rows);
    
  } catch (error) {
    console.error('Error checking balances:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkBalances();
