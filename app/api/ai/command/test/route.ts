import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'OPENAI_API_KEY is not set in environment variables',
          help: 'Please set the OPENAI_API_KEY in your .env.local file'
        }, 
        { status: 500 }
      );
    }

    const response = await fetch('http://localhost:3001/api/ai/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, world!' },
        ],
        // Include the API key in the request for testing
        apiKey: apiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      return NextResponse.json(
        { 
          error: `API Error (${response.status}): ${response.statusText}`,
          details: errorText,
        }, 
        { status: response.status }
      );
    }

    // For streaming responses, we'll just confirm we got a successful response
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return NextResponse.json({ 
        success: true,
        message: 'Streaming connection established successfully',
        contentType: response.headers.get('content-type')
      });
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true,
      data,
      contentType: response.headers.get('content-type')
    });
  } catch (error) {
    console.error('Test Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test the AI endpoint',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
