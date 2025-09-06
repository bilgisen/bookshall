// Save this code in your browser's developer console when logged into the app
// This will test the chapter API endpoint with the current session

async function testChapterApi() {
  try {
    // Get the most recent book and chapter from the database
    const response = await fetch('/api/books/recent');
    const { book, chapter } = await response.json();

    if (!book || !chapter) {
      console.error('No books with chapters found in the database.');
      return;
    }

    console.log('Found test data:');
    console.log(`- Book ID: ${book.id}`);
    console.log(`- Book Title: ${book.title}`);
    console.log(`- Book Slug: ${book.slug}`);
    console.log(`- Chapter ID: ${chapter.id}`);
    console.log(`- Chapter Title: ${chapter.title}`);

    console.log('Testing API with current session...');
    
    // Test the API endpoint with the current session
    const apiResponse = await fetch(
      `/api/books/by-slug/${book.slug}/chapters/${chapter.id}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      console.error(`API Error (${apiResponse.status}): ${error}`);
      return;
    }

    const data = await apiResponse.json();
    console.log('\nAPI Response:');
    console.log(JSON.stringify(data, null, 2));

    // Verify the response structure
    const requiredFields = [
      'id', 'title', 'content', 'order', 'level', 'isDraft',
      'wordCount', 'createdAt', 'updatedAt', 'bookId', 'book'
    ];

    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      console.error('\nMissing required fields in response:', missingFields);
    } else {
      console.log('\n✅ All required fields are present in the response');
    }

    // Verify book info
    const requiredBookFields = ['id', 'title', 'slug'];
    const missingBookFields = requiredBookFields.filter(field => !(field in data.book));
    if (missingBookFields.length > 0) {
      console.error('\nMissing required book fields:', missingBookFields);
    } else {
      console.log('✅ All required book fields are present');
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`You can view the chapter at: /dashboard/books/${book.slug}/chapters/${chapter.id}/view`);

  } catch (error) {
    console.error('Error testing chapter API:', error);
  }
}

// Create a temporary API endpoint to get the most recent book and chapter
// This is a one-time setup for testing purposes
async function setupTestEndpoint() {
  const response = await fetch('/api/books/recent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ setup: true }),
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Test endpoint created successfully');    
  } else {
    console.log('Test endpoint already exists or error:', result.message);
  }
}

// Run the setup and then the test
setupTestEndpoint().then(testChapterApi);
