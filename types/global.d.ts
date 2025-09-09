// Type definitions for Node.js modules
/// <reference types="node" />

// Ensure Buffer is available globally
declare const Buffer: {
  from(str: string, encoding?: string): Buffer;
  alloc(size: number): Buffer;
  // Add other Buffer methods as needed
};

// Type definitions for Polar SDK
declare module '@polar-sh/sdk' {
  // Add type definitions for Polar SDK here if needed
  // This is a placeholder - replace with actual types from the SDK
  export interface Event {
    type: string;
    data: {
      object: Record<string, unknown>;
    };
  }

  export interface CheckoutSession {
    id: string;
    // Add other properties as needed
  }

  export interface Subscription {
    id: string;
    // Add other properties as needed
  }
}
