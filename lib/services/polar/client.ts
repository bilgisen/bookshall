import { Polar } from '@polar-sh/sdk';

// Initialize Polar client with environment configuration
const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
  server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

export { polarClient };
