const fetch = require('node-fetch');
require('dotenv').config();

// Enable detailed logging
process.env.DEBUG = 'true';

async function testBalanceAPI() {
  console.log('Starting balance API test...');
  try {
    // Get the user ID from the database
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    const userRes = await client.query('SELECT id, email FROM "user" LIMIT 1');
    await client.release();
    await pool.end();
    
    if (userRes.rows.length === 0) {
      console.error('No users found in the database');
      return;
    }
    
    const user = userRes.rows[0];
    console.log(`Testing balance API for user: ${user.email} (${user.id})`);
    
    // Make a request to the balance API
    const url = 'http://localhost:3000/api/credits/balance';
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `user-id=${user.id}`,
        'x-debug': 'true' // Add debug header
      },
      credentials: 'include'
    });
    
    console.log('API Response Status:', response.status, response.statusText);
    console.log('Response Headers:', JSON.stringify([...response.headers.entries()], null, 2));
    
    let data;
    try {
      const text = await response.text();
      console.log('Raw Response Body:', text);
      data = text ? JSON.parse(text) : {};
      console.log('Parsed Response Data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      data = { error: 'Failed to parse response', details: parseError.message };
    }
    
    // Check the raw database record
    const dbPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const dbClient = await dbPool.connect();
    const dbResult = await dbClient.query(
      'SELECT * FROM user_balances WHERE user_id = $1', 
      [user.id]
    );
    
    console.log('\nRaw database record for user:');
    console.table(dbResult.rows);
    
    await dbClient.release();
    await dbPool.end();
    
  } catch (error) {
    console.error('Error testing balance API:', error);
  }
}

testBalanceAPI();
