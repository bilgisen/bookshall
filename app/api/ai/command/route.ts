import type { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText } from 'ai';
import { NextResponse } from 'next/server';

import { markdownJoinerTransform } from '@/lib/markdown-joiner-transform';

export const maxDuration = 300; // 5 minutes

type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { apiKey: key, messages, system } = await req.json() as {
      apiKey?: string;
      messages: AIMessage[];
      system?: string;
    };

    // Get API key from request or environment variables
    const apiKey = key || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('Missing OpenAI API key');
      return NextResponse.json(
        { 
          error: 'Missing OpenAI API key',
          help: 'Please set the OPENAI_API_KEY in your .env.local file or provide it in the request body as apiKey',
          solution: '1. Get an API key from https://platform.openai.com/api-keys\n2. Create a .env.local file in your project root\n3. Add: OPENAI_API_KEY=your-api-key-here',
        },
        { status: 401 }
      );
    }

    // Validate request payload
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing messages array in request body.' },
        { status: 400 }
      );
    }

    const openai = createOpenAI({ apiKey });
    const model = openai('gpt-4o');

    try {
      // Convert messages to the format expected by the AI SDK
      const coreMessages = convertToCoreMessages(messages);
      
      // Create the completion with proper typing
      const result = await streamText({
        model,
        messages: coreMessages,
        system,
        // Use the correct parameter names for the AI SDK
        ...(system ? { system } : {}),
        // Use snake_case for OpenAI API parameters
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        // Add markdown joiner transform for better markdown handling
        experimental_transform: markdownJoinerTransform(),
      });

      // Return the streaming response
      return result.toTextStreamResponse();
    } catch (error) {
      console.error('Error streaming AI response:', error);
      return NextResponse.json(
        { error: 'Failed to generate AI response. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing AI request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
