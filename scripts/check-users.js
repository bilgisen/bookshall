const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkUsers() {
  const client = await pool.connect();
  
  try {
    // Check users in auth.users
    const usersRes = await client.query('SELECT id, email, created_at FROM auth.users');
    console.log('Users in auth.users:', usersRes.rows);
    
    // Check credit_balances
    const balancesRes = await client.query('SELECT * FROM credit_balances');
    console.log('Credit balances:', balancesRes.rows);
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers();
