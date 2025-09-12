import 'better-auth';

declare module 'better-auth' {
  interface Auth {
    api: {
      getSession: (options: { headers: HeadersInit }) => Promise<{
        user?: {
          id: string;
          email?: string;
          name?: string;
          image?: string;
        };
      }>;
    };
  }
}
