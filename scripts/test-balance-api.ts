import axios from 'axios';
import dotenv from 'dotenv';
import { auth } from '../lib/auth';

dotenv.config();

async function testBalanceApi() {
  try {
    // Get the auth token using the new auth system
    const { session } = await auth();
    
    if (!session) {
      throw new Error('No session available');
    }
    
    // Get the session token from the cookie
    const cookies = session.cookies || [];
    const sessionCookie = cookies.find(cookie => cookie.name === 'better-auth.session_token');
    
    if (!sessionCookie?.value) {
      throw new Error('No session token available in cookies');
    }
    
    const token = sessionCookie.value;
    
    // Make a request to the balance endpoint
    const response = await axios.get('http://localhost:3000/api/credits/balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-debug': 'true',
        'Cookie': `better-auth.session_token=${token}`
      },
      withCredentials: true
    });
    
    console.log('Balance API response:', response.data);
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

testBalanceApi();
