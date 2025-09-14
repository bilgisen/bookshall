const { Pool } = require('pg');
require('dotenv').config();

async function testBalanceEndpoint() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    // Get a test user ID
    const userRes = await client.query('SELECT id, email FROM "user" LIMIT 1');
    if (userRes.rows.length === 0) {
      console.error('No users found in the database');
      return;
    }
    
    const user = userRes.rows[0];
    console.log(`Testing balance for user: ${user.email} (${user.id})`);
    
    // Test the getBalance function directly
    const CreditService = require('../lib/services/credit/credit.service').default;
    const balance = await CreditService.getBalance(user.id);
    console.log('Balance from CreditService.getBalance:', balance);
    
    // Test the repository function directly
    const { getUserBalance } = require('../lib/services/credit/credit.repository');
    const db = require('../lib/db');
    const repoResult = await getUserBalance(db, user.id);
    console.log('Balance from repository.getUserBalance:', repoResult);
    
    // Check the raw database record
    const dbResult = await client.query(
      'SELECT * FROM user_balances WHERE user_id = $1', 
      [user.id]
    );
    console.log('Raw database record:', dbResult.rows[0] || 'No balance record found');
    
  } catch (error) {
    console.error('Error testing balance endpoint:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testBalanceEndpoint();
