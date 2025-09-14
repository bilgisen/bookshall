// scripts/test-book-payload.ts
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBookPayload() {
  try {
    // First, try to get any book from the database
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, isPublished')
      .limit(1);

    if (error) {
      console.error('Error fetching books:', error);
      return;
    }

    if (!books || books.length === 0) {
      console.log('No books found in the database');
      return;
    }

    const book = books[0];
    console.log(`Testing book payload for: ${book.title} (ID: ${book.id})`);

    // Test the API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/books/by-id/${book.id}/payload`;
    
    console.log(`\nMaking request to: ${url}`);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    try {
      // Try to parse as JSON first
      const data = JSON.parse(responseText);
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
      // If not JSON, display as text
      console.log('Response text (not JSON):', responseText);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testBookPayload();
