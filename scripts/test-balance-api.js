const fetch = require('node-fetch');
require('dotenv').config();

async function testBalanceAPI() {
  try {
    const response = await fetch('https://bookshall.com/api/credits/balance', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.TEST_COOKIE || '' // You'll need to set this in your .env file
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      return;
    }
    
    const data = await response.json();
    console.log('Balance API response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing balance API:', error);
  }
}

testBalanceAPI();
