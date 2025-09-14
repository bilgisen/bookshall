const { Pool } = require('pg');
require('dotenv').config();

async function checkUserBalance() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Check if user_balances table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_balances'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.error('Error: user_balances table does not exist');
      return;
    }
    
    // Get a user with their balance
    const userWithBalance = await client.query(`
      SELECT u.id, u.email, ub.balance, ub.updated_at
      FROM "user" u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LIMIT 5;
    `);
    
    console.log('Users with their balances:');
    console.table(userWithBalance.rows);
    
    // Check if there are any credit transactions
    const transactions = await client.query(`
      SELECT * FROM credit_transactions
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log('\nRecent credit transactions:');
    console.table(transactions.rows);
    
  } catch (error) {
    console.error('Error checking user balance:', error);
  } finally {
    await pool.end();
  }
}

checkUserBalance();
