'use client';

import { useChat as useBaseChat, type UseChatOptions } from '@ai-sdk/react';
import { AIChatPlugin } from '@platejs/ai/react';
import { usePluginOption } from '@platejs/core/react';

// Define a type for the chat options that can be passed to the hook
type AIChatOptions = {
  api?: string;
  body?: Record<string, unknown>;
};

/**
 * Custom hook for handling AI chat functionality within the editor
 */
export const useChat = () => {
  // Get chat options from the plugin configuration
  const options = usePluginOption(AIChatPlugin, 'chat') as AIChatOptions | undefined;

  // Initialize the chat with proper typing
  const chat = useBaseChat({
    id: 'editor',
    ...(options?.api && { api: options.api }),
    body: {
      // Include any additional options from the plugin configuration
      ...(options?.body || {}),
    } as Record<string, unknown>,
    onError: (error) => {
      console.error('AI Chat Error:', error);
    },
  } as UseChatOptions<any>);

  return chat;
};
